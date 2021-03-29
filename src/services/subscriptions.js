const { StatusCodes } = require('http-status-codes');

const axios = require('axios');
const db = require('../storage/DataAccess');
const { startReportingWorkflow } = require('../utils/reporting_workflow');
const { getServerById } = require('../storage/servers');
const {
  getEndpointId,
  subscriptionsFromPlanDef,
  postSubscriptionsToEHR,
  getBaseUrlFromFullUrl,
  topicToResourceType
} = require('../utils/fhir');
const { getAccessToken } = require('../utils/client');
const { PLANDEFINITIONS, ENDPOINTS } = require('../storage/collections');
const { default: base64url } = require('base64url');
const debug = require('../storage/logs').debug('medmorph-backend:subscriptions');
const error = require('../storage/logs').error('medmorph-backend:subscriptions');

/**
 * Handle KA notifications
 */
async function knowledgeArtifact(req, res) {
  const id = req.params.id;
  const bundle = req.body;
  const server = getServerById(id);

  if (!server) res.sendStatus(StatusCodes.NOT_FOUND);
  else if (bundle.entry.length <= 1) {
    // TODO: MEDMORPH-50 will implement this for payload type "empty"
    error(`Unsupported notification payload type 'empty' from Bundle/${bundle.id}`);
    res.sendStatus(StatusCode.BAD_REQUEST);
  } else {
    const planDefinitions = bundle.entry.reduce((filtered, entry) => {
      if (entry.resource?.resourceType === 'PlanDefinition') filtered.push(entry.resource);
      return filtered;
    }, []);

    if (!planDefinitions.length) {
      // TODO: MEDMORPH-50 will implement this for payload type "id-only"
      error(`Unsupported notification payload type 'id-only' from Bundle/${bundle.id}`);
      res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    planDefinitions.forEach(async planDefinition => {
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
      axios
        .get(`${server.endpoint}/Endpoint/${endpointId}`, { headers: headers })
        .then(response => {
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
    });

    res.sendStatus(StatusCodes.OK);
  }
}

/**
 * Handle EHR Notifications and begin reporting workflow
 */
function reportTrigger(req, res) {
  const bundle = req.body;
  const { fullUrl } = req.params;
  const planDefFullUrl = base64url.decode(fullUrl);
  const serverUrl = getBaseUrlFromFullUrl(planDefFullUrl);
  const planDef = getPlanDef(planDefFullUrl);

  if (!planDef) res.sendStatus(StatusCodes.NOT_FOUND);
  else if (bundle.entry.length <= 1) {
    // TODO: MEDMORPH-50 will implement this for payload type "empty"
    error(`Unsupported notification payload type 'empty' from Bundle/${bundle.id}`);
    res.sendStatus(StatusCodes.BAD_REQUEST);
  } else {
    // Filter to only resource(s) which triggered the notification
    const parameters = bundle.entry[0].resource;
    const topic = parameters.parameter.find(p => p.name === 'topic').valueCanonical;
    const resourceType = topicToResourceType(topic);
    const resources = bundle.entry.reduce((filtered, entry) => {
      if (entry.resource?.resourceType === resourceType) filtered.push(entry.resource);
      return filtered;
    }, []);

    if (!resources.length) {
      // TODO: MEDMORPH-50 will implement this for payload type "id-only"
      error(`Unsupported notification payload type 'id-only' from Bundle/${bundle.id}`);
      res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    // For each triggering resource save to the db and begin reporting workflow
    resources.forEach(resource => {
      const resourceFullUrl = `${serverUrl}/${resourceType}/${resource.id}`;
      debug(`Received ${resourceType}/${resource.id} from subscription ${resourceFullUrl}`);
      const collection = `${resourceType.toLowerCase()}s`;
      db.upsert(
        collection,
        { fullUrl: resourceFullUrl, ...resource },
        r => r.fullUrl === resourceFullUrl
      );
      startReportingWorkflow(planDef, serverUrl, resource);
    });

    res.sendStatus(StatusCodes.OK);
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
