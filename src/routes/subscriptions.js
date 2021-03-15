const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../storage/DataAccess');
const { startReportingWorkflow } = require('../utils/reporting_workflow');
const { getServerById } = require('../storage/servers');
const {
  refreshKnowledgeArtifact,
  getEndpointId,
  subscriptionsFromPlanDef,
  postSubscriptionsToEHR,
  getBaseUrlFromFullUrl
} = require('../utils/fhir');
const { getAccessToken } = require('../utils/client');
const { PLANDEFINITIONS, ENDPOINTS } = require('../storage/collections');
const { default: base64url } = require('base64url');
const debug = require('../storage/logs').debug('medmorph-backend:subscriptions');

/**
 * Notification from KA Repo to refresh artifacts. The id param is the
 * server id from the database
 */
router.post('/ka/:id', (req, res) => {
  const id = req.params.id;
  const server = getServerById(id);
  if (server) {
    refreshKnowledgeArtifact(server);
    debug(`Recieved notification to refresh knowledge artifacts for server with id ${id}`);
    res.sendStatus(StatusCodes.OK);
  } else res.sendStatus(StatusCodes.NOT_FOUND);
});

/**
 * Notification from KA Repo to refresh artifacts. The id param is the
 * server id from the database and resourceId is the PlanDefinition id.
 * The body contains the triggering PlanDefinition
 */
router.put('/ka/:id/:resource/:resourceId', async (req, res) => {
  const id = req.params.id;
  const planDefinition = req.body;
  const endpointId = getEndpointId(planDefinition);
  const server = getServerById(id);

  if (!server) {
    res.sendStatus(StatusCodes.NOT_FOUND);
    return;
  }

  const planDefinitionFullUrl = `${server.endpoint}/PlanDefinition/${planDefinition.id}`;
  db.upsert(
    PLANDEFINITIONS,
    { fullUrl: planDefinitionFullUrl, ...planDefinition },
    r => r.fullUrl === planDefinitionFullUrl
  );
  debug(`Fetched ${server.endpoint}/PlanDefinition/${planDefinition.id}`);

  const token = await getAccessToken(server.endpoint);
  const headers = { Authorization: `Bearer ${token}` };
  axios.get(`${server.endpoint}/Endpoint/${endpointId}`, { headers: headers }).then(response => {
    if (response.data) {
      const endpoint = response.data;
      const endpointFullUrl = `${server.endpoint}/Endpoint/${endpoint.id}`;
      db.upsert(
        ENDPOINTS,
        { fullUrl: endpointFullUrl, ...endpoint },
        r => r.fullUrl === endpointFullUrl
      );
      debug(`Fetched ${endpointFullUrl}`);
    }
  });

  const subscriptions = subscriptionsFromPlanDef(planDefinition, server.endpoint);
  postSubscriptionsToEHR(subscriptions);

  res.sendStatus(StatusCodes.OK);
});

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition id which defines the workflow
 */
router.post('/:fullUrl', (req, res) => {
  const fullUrl = req.params.fullUrl;
  const planDef = getPlanDef(fullUrl);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    startReportingWorkflow(planDef, fullUrl);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition if which defines the workflow. The body
 * contains the triggering resource.
 */
router.put('/:fullUrl/:resource/:resourceId', (req, res) => {
  const planDef = getPlanDef(req.params.fullUrl);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    const serverUrl = getBaseUrlFromFullUrl(base64url.decode(req.params.fullUrl));
    const fullUrl = `${serverUrl}/${req.params.resource}/${req.params.resourceId}`;
    debug(`Received ${req.params.resource}/${req.params.resourceId} from subscription ${fullUrl}`);
    const collection = `${req.body.resourceType.toLowerCase()}s`;
    db.upsert(collection, { fullUrl, ...req.body }, r => r.fullUrl === fullUrl);
    startReportingWorkflow(planDef, serverUrl, req.body);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

/**
 * Retrieves the PlanDefinition with the given id from the db
 *
 * @param {string} fullUrl - the base 64 url encoded fullUrl of the PlanDefinition
 * @returns the PlanDefinition with the given id or null if not found
 */
function getPlanDef(fullUrl) {
  const decodedFullUrl = base64url.decode(fullUrl);
  const resultList = db.select(PLANDEFINITIONS, s => s.fullUrl === decodedFullUrl);
  if (resultList[0]) return resultList[0];
  else return null;
}

module.exports = router;
