const debug = require('../storage/logs').debug('medmorph-backend:fhir');
const db = require('../storage/DataAccess');
const { subscriptionsFromBundle } = require('./subscriptions');
const { SERVERS, ENDPOINTS } = require('../storage/collections');
const { EXTENSIONS, getResources, getReferencedResource } = require('./fhir');

/**
 * Get all knowledge artifacts (from servers registered in the
 * db) and save them. Stores all referenced resources as well.
 */
function refreshAllKnowledgeArtifacts() {
  const servers = db.select(SERVERS, s => s.type === 'KA');
  servers.forEach(server => refreshKnowledgeArtifact(server));
}

/**
 * Get knowledge artifacts from a specific server.
 *
 * @param {*} server - the server to refresh artifacts from
 */
function refreshKnowledgeArtifact(server) {
  getResources(server.endpoint, 'PlanDefinition').then(bundle => {
    if (bundle) {
      // Create/Update subscriptions from PlanDefinitions
      subscriptionsFromBundle(bundle, server.endpoint);

      bundle.entry.forEach(async entry => {
        if (entry.resource.resourceType === 'PlanDefinition')
          fetchEndpoint(server.endpoint, entry.resource);
      });
    }
  });
}

/**
 * Fetchs the referenced Endpoint from receiver address extension and saves to the database
 *
 * @param {string} url - the url to fetch from
 * @param {PlanDefinition} planDefinition - PlanDefinition to get Endpoint from
 */
function fetchEndpoint(url, planDefinition) {
  const endpointReference = getReceiverAddress(planDefinition);
  getReferencedResource(url, endpointReference, true).then(endpoint => {
    if (endpoint) {
      db.upsert(ENDPOINTS, endpoint, r => r.fullUrl === endpoint.fullUrl);
      debug(`Endpoint/${endpoint.id} saved to db`);
    }
  });
}

/**
 * Extracts the Endpoint reference from the receiver address extension of the PlanDefinition
 *
 * @param {PlanDefinition} planDefinition - PlanDefinitions to extract from
 * @returns reference string or null
 */
function getReceiverAddress(planDefinition) {
  const receiverAddress = planDefinition.extension.find(e => e.url === EXTENSIONS.RECEIVER_ADDRESS);
  return receiverAddress ? receiverAddress.valueReference.reference : null;
}

module.exports = {
  fetchEndpoint,
  getReceiverAddress,
  refreshAllKnowledgeArtifacts,
  refreshKnowledgeArtifact
};
