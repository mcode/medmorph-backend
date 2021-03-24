const { StatusCodes } = require('http-status-codes');

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

async function knowledgeArtifact(req, res) {
  const id = req.params.id;
  const server = getServerById(id);

  if (!server) {
    res.sendStatus(StatusCodes.NOT_FOUND);
    return;
  }

  if (req.body) {
    // Notification from /ka/:id/:resource/:resourceId
    const planDefinition = req.body;
    const endpointId = getEndpointId(planDefinition);

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
  } else {
    // Notification from /ka/:id
    refreshKnowledgeArtifact(server);
    debug(`Recieved notification to refresh knowledge artifacts for server with id ${id}`);
  }

  res.sendStatus(StatusCodes.OK);
}

function reportTrigger(req, res) {
  const { fullUrl, resource: resourceType, resourceId } = req.params;
  const planDefFullUrl = base64url.decode(fullUrl);
  const serverUrl = getBaseUrlFromFullUrl(planDefFullUrl);
  const planDef = getPlanDef(planDefFullUrl);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    if (resourceType && resourceId && req.body) {
      const resourceFullUrl = `${serverUrl}/${resourceType}/${resourceId}`;
      debug(`Received ${resourceType}/${resourceId} from subscription ${resourceFullUrl}`);
      const collection = `${resourceType.toLowerCase()}s`;
      db.upsert(collection, { resourceFullUrl, ...req.body }, r => r.fullUrl === resourceFullUrl);
    }
    startReportingWorkflow(planDef, serverUrl, req.body);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
}

/**
 * Retrieves the PlanDefinition with the given id from the db
 *
 * @param {string} fullUrl - the fullUrl of the PlanDefinition
 * @returns the PlanDefinition with the given id or null if not found
 */
function getPlanDef(fullUrl) {
  const resultList = db.select(PLANDEFINITIONS, s => s.fullUrl === fullUrl);
  if (resultList[0]) return resultList[0];
  else return null;
}

module.exports = { knowledgeArtifact, reportTrigger };
