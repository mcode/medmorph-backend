const { StatusCodes } = require('http-status-codes');

const db = require('../storage/DataAccess');
const { startReportingWorkflow } = require('../utils/reporting_workflow');
const { getServerById, getEHRServer } = require('../storage/servers');
const {
  postSubscriptionsToEHR,
  getBaseUrlFromFullUrl,
  getPlanDef,
  getResources,
  getResourceFromServer,
  EXTENSIONS
} = require('../utils/fhir');
const {
  fetchEndpoint,
  fetchValueSets,
  refreshKnowledgeArtifact
} = require('../utils/knowledgeartifacts');
const {
  subscriptionsFromPlanDef,
  topicToResourceType,
  getSubscriptionsFromPlanDef
} = require('../utils/subscriptions');
const { PLANDEFINITIONS, SUBSCRIPTIONS } = require('../storage/collections');
const { default: base64url } = require('base64url');
const { compareUrl } = require('../utils/url');
const debug = require('../storage/logs').debug('medmorph-backend:subscriptions');

/**
 * Handle KA notifications
 */
async function knowledgeArtifact(req, res) {
  const id = req.params.id;
  const bundle = req.body;
  const server = getServerById(id);

  if (!server) res.sendStatus(StatusCodes.NOT_FOUND);
  else if (bundle.entry.length <= 1) {
    knowledgeArtifactEmptyHandler(server.endpoint, res);
  } else {
    const planDefinitions = bundle.entry.reduce((filtered, entry) => {
      if (entry.resource?.resourceType === 'PlanDefinition') filtered.push(entry.resource);
      return filtered;
    }, []);

    if (!planDefinitions.length) {
      knowledgeArtifactIdOnlyHandler(bundle, server.endpoint, res);
    } else {
      knowledgeArtifactFullResourceHandler(planDefinitions, server.endpoint, res);
    }
  }
}

/**
 * Handle EHR Notifications and begin reporting workflow
 */
function reportTrigger(req, res) {
  const bundle = req.body;
  const { fullUrl } = req.params;
  const planDefFullUrl = base64url.decode(fullUrl);
  const kaBaseUrl = getBaseUrlFromFullUrl(planDefFullUrl);
  const planDef = getPlanDef(planDefFullUrl);
  const parameters = bundle.entry[0].resource;
  const topic = parameters.parameter.find(p => p.name === 'topic').valueCanonical;
  const resourceType = topicToResourceType(topic);

  if (!planDef) res.sendStatus(StatusCodes.NOT_FOUND);
  else if (bundle.entry.length <= 1)
    reportTriggerEmptyHandler(planDef, topic, resourceType, kaBaseUrl, res);
  else {
    // Filter to only resource(s) which triggered the notification
    const resources = bundle.entry.reduce((filtered, entry) => {
      if (entry.resource?.resourceType === resourceType) filtered.push(entry.resource);
      return filtered;
    }, []);

    if (!resources.length) {
      reportTriggerIdOnlyHandler(bundle, planDef, resourceType, kaBaseUrl, res);
    } else {
      reportTriggerFullResourceHandler(planDef, resources, resourceType, kaBaseUrl, res);
    }
  }
}

/**
 * Handle start reporting workflow when the notification bundle has payload type full-resource
 *
 * @param {PlanDefinition} planDef - the plan definition associated with the notification
 * @param {*} resources - list of triggering resources from the notification bundle
 * @param {string} resourceType - the type of all the resources
 * @param {string} kaBaseUrl - the base url of the ka server
 * @param {*} res - the express response object
 */
function reportTriggerFullResourceHandler(planDef, resources, resourceType, kaBaseUrl, res) {
  // For each triggering resource save to the db and begin reporting workflow
  resources.forEach(resource => {
    debug(`Received ${resourceType}/${resource.id} from subscription`);
    handleReportTriggerResource(resource, planDef, resourceType, kaBaseUrl);
  });
  res.sendStatus(StatusCodes.OK);
}

/**
 * Handle start reporting workflow when the notification bundle has payload type id-only
 *
 * @param {Bundle} bundle - notification bundle
 * @param {PlanDefinition} planDef - the plan definition associated with the notification
 * @param {string} resourceType - the type of all the resources
 * @param {string} kaBaseUrl - the base url of the ka server
 * @param {*} res - the express response object
 */
function reportTriggerIdOnlyHandler(bundle, planDef, resourceType, kaBaseUrl, res) {
  const resourceFullUrls = getResourceFullUrls(bundle);

  resourceFullUrls.forEach(async resourceFullUrl => {
    const resource = await getResourceFromServer(resourceFullUrl, getEHRServer().endpoint);
    if (resource?.resourceType === resourceType) {
      debug(`Received ${resourceType}/${resource.id} from subscription`);
      handleReportTriggerResource(resource, planDef, resourceType, kaBaseUrl);
    }
  });

  res.sendStatus(StatusCodes.OK);
}

/**
 * Handle start reporting workflow when the notification bundle has payload type empty
 *
 * @param {PlanDefinition} planDef - the plan definition associated with the notification
 * @param {string} topic - the topic url of this subscription notification
 * @param {string} resourceType - the type of all the resources
 * @param {string} kaBaseUrl - the base url of the ka server
 * @param {*} res - the express response object
 */
async function reportTriggerEmptyHandler(planDef, topic, resourceType, kaBaseUrl, res) {
  const subscription = getSubscriptionsFromPlanDef(planDef.fullUrl).find(s => {
    const subscriptionTopic = s.extension.find(t => compareUrl(t.url, EXTENSIONS.BACKPORT_TOPIC));
    return compareUrl(subscriptionTopic.valueUri, topic);
  });
  const date = new Date(subscription.timestamp);
  const server = getEHRServer().endpoint;
  const lastUpdatedQuery = `_lastUpdated=gt${date.toISOString()}`;
  const query =
    resourceType === 'Observation' ? `${lastUpdatedQuery}&category=laboratory` : lastUpdatedQuery;

  let status = StatusCodes.OK;
  const resourceBundle = await getResources(server, resourceType, '');
  if (resourceBundle) {
    resourceBundle.entry.forEach(entry => {
      handleReportTriggerResource(entry.resource, planDef, resourceType, kaBaseUrl);
    });
  } else {
    status = StatusCodes.NOT_FOUND;
    debug(`No resources found for query ${server}/${resourceType}?${query}`);
  }

  db.update(
    SUBSCRIPTIONS,
    s => compareUrl(s.fullUrl, subscription.fullUrl),
    s => Object.assign(s, { timestamp: Date.now(), ...subscription })
  );

  res.sendStatus(status);
}

/**
 * Helper method to save the resource to the database and then begin reporting workflow
 *
 * @param {*} resource - the triggering resource
 * @param {PlanDefinition} planDef - the PlanDefinition associated with the notification
 * @param {string} resourceType - the type of the resource
 * @param {string} kaBaseUrl - the base url of the ka server
 */
function handleReportTriggerResource(resource, planDef, resourceType, kaBaseUrl) {
  const resourceFullUrl = `${getEHRServer().endpoint}/${resourceType}/${resource.id}`;
  const collection = `${resourceType.toLowerCase()}s`;
  db.upsert(collection, { fullUrl: resourceFullUrl, ...resource }, r =>
    compareUrl(r.fullUrl, resourceFullUrl)
  );
  startReportingWorkflow(planDef, kaBaseUrl, resource);
}

/**
 *
 * @param {PlanDefinition[]} planDefinitions - list of all plan defs in the notification bundle
 * @param {string} serverUrl - the base url of the KA server
 * @param {*} res - the express response object
 */
function knowledgeArtifactFullResourceHandler(planDefinitions, serverUrl, res) {
  planDefinitions.forEach(async planDefinition => {
    const planDefinitionFullUrl = `${serverUrl}/PlanDefinition/${planDefinition.id}`;
    handleUpdatedKnowledgeArtifact(planDefinition, planDefinitionFullUrl, serverUrl);
    debug(`KA full-resource notification contained ${planDefinitionFullUrl}`);
  });

  res.sendStatus(StatusCodes.OK);
}

/**
 * Handle fetch ka when the notification bundle has payload type id-only
 *
 * @param {Bundle} bundle - notification bundle
 * @param {string} serverUrl - the base url of the KA server
 * @param {*} res - the express response object
 */
function knowledgeArtifactIdOnlyHandler(bundle, serverUrl, res) {
  const resourceFullUrls = getResourceFullUrls(bundle);

  resourceFullUrls.forEach(async resourceFullUrl => {
    const resource = await getResourceFromServer(resourceFullUrl, serverUrl);
    if (resource.resourceType === 'PlanDefinition') {
      handleUpdatedKnowledgeArtifact(resource, resourceFullUrl, serverUrl);
      debug(`KA id-only notification contained ${resourceFullUrl}`);
    }
  });

  res.sendStatus(StatusCodes.OK);
}

/**
 * Handle fetch ka when the notification bundle has payload type empty
 *
 * @param {string} serverUrl - the base url of the KA server
 * @param {*} res - the express response object
 */
function knowledgeArtifactEmptyHandler(serverUrl, res) {
  debug(`KA empty notification received. Refreshing all Knowledge Artifacts for ${serverUrl}`);
  refreshKnowledgeArtifact(serverUrl);
  res.sendStatus(StatusCodes.OK);
}

/**
 * Helper method to save a PlanDefinition to the db, fetch endpoints, fetch value sets,
 * and create subscriptions from the knowledge artifact
 *
 * @param {PlanDefinition} planDefinition - the knowledge artifact
 * @param {string} fullUrl - the fullUrl of the PlanDefinition
 * @param {string} serverUrl - the knowledge artifact repository base url
 */
function handleUpdatedKnowledgeArtifact(planDefinition, fullUrl, serverUrl) {
  db.upsert(PLANDEFINITIONS, { fullUrl: fullUrl, resource: planDefinition }, r =>
    compareUrl(r.fullUrl, fullUrl)
  );

  fetchEndpoint(serverUrl, planDefinition);

  fetchValueSets(serverUrl, planDefinition, null);

  const subscriptions = subscriptionsFromPlanDef(planDefinition, serverUrl);
  postSubscriptionsToEHR(subscriptions);
}

/**
 * Helper method for the id-only payload to get a list of all the entry fullUrls
 * minus the SubscriptionStatus.
 *
 * @param {Bundle} bundle - the notification bundle
 * @returns list of all fullUrls for id-only payloads
 */
function getResourceFullUrls(bundle) {
  return bundle.entry.reduce((filtered, entry) => {
    if (!entry.resource) {
      if (entry.fullUrl) filtered.push(entry.fullUrl);
      else if (entry.request) filtered.push(entry.request.url);
      else if (entry.response) filtered.push(entry.response.location);
    }
    return filtered;
  }, []);
}

module.exports = { knowledgeArtifact, reportTrigger };
