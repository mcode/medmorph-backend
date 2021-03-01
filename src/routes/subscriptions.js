const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../storage/DataAccess');
const { startReportingWorkflow } = require('../utils/reporting_workflow');
const { getServerById } = require('../storage/servers');
const { refreshKnowledgeArtifact, getEndpointId } = require('../utils/fhir');
const { getAccessToken } = require('../utils/client');
const debug = require('debug')('medmorph-backend:server');

const COLLECTION = 'plandefinitions';
const ENDPOINTS = 'endpoints';

/**
 * Notification from KA Repo to refresh artifacts. The id param is the
 * server id from the database
 */
router.post('/ka/:id', (req, res) => {
  const id = req.params.id;
  const server = getServerById(id);
  if (server) {
    refreshKnowledgeArtifact(server);
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

  db.upsert(COLLECTION, planDefinition, r => r.id === planDefinition.id);
  debug(`Fetched ${server.endpoint}/PlanDefinition/${planDefinition.id}`);

  const token = await getAccessToken(server.endpoint);
  const headers = { Authorization: `Bearer ${token}` };
  axios.get(`${server.endpoint}/Endpoint/${endpointId}`, { headers: headers }).then(response => {
    if (response.data) {
      const endpoint = response.data;
      db.upsert(ENDPOINTS, endpoint, r => r.id === endpoint.id);
      debug(`Fetched ${server.endpoint}/Endpoint/${endpoint.id}`);
    }
  });

  res.sendStatus(StatusCodes.OK);
});

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition id which defines the workflow
 */
router.post('/:id', (req, res) => {
  const id = req.params.id;
  const planDef = getPlanDef(id);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    startReportingWorkflow(planDef);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition if which defines the workflow. The body
 * contains the triggering resource.
 */
router.put('/:id/:resource/:resourceId', (req, res) => {
  const id = req.params.id;
  const planDef = getPlanDef(id);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    startReportingWorkflow(planDef, req.body);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

/**
 * Retrieves the PlanDefinition with the given id from the db
 *
 * @param {string} id - the id of the PlanDefinition
 * @returns the PlanDefinition with the given id or null if not found
 */
function getPlanDef(id) {
  const resultList = db.select(COLLECTION, s => s.id === id);
  if (resultList[0]) return resultList[0];
  else return null;
}

module.exports = router;
