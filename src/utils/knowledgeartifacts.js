const debug = require('../storage/logs').debug('medmorph-backend:fhir');
const error = require('../storage/logs').error('medmorph-backend:fhir');
const db = require('../storage/DataAccess');
const { subscriptionsFromBundle } = require('./subscriptions');
const { SERVERS, ENDPOINTS, VALUESETS } = require('../storage/collections');
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
        if (entry.resource.resourceType === 'PlanDefinition') {
          fetchEndpoint(server.endpoint, entry.resource);
          fetchValueSets(server.endpoint, entry.resource, bundle);
        }
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
  getReferencedResource(url, endpointReference, planDefinition, true).then(endpoint => {
    if (endpoint) {
      db.upsert(ENDPOINTS, endpoint, r => r.fullUrl === endpoint.fullUrl);
      debug(`Endpoint/${endpoint.id} saved to db`);
    }
  });
}

/**
 * Fetches any referenced ValueSets from the planDefinition and saves to the database
 *
 * @param {string} url - fhir server base url to fetch from
 * @param {PlanDefinition} planDefinition - PlanDefinition to search for referenced ValueSets
 * @param {Bundle} bundle - the Bundle the PlanDefinition was returned in,
 *                          in case it already contains the VS we want
 */
async function fetchValueSets(url, planDefinition, bundle) {
  const valueSets = new Set();

  if (planDefinition.relatedArtifact) {
    for (const relatedArtifact of planDefinition.relatedArtifact) {
      // TODO: seems like there are a lot of ways that we might need to fetch a VS
      // for now just assume it will be referenced in the resource field.
      // further, there is no guaranteed way to know what is being referenced is a VS
      // so let's just check the URL and hope it contains the string ValueSet
      if (relatedArtifact.resource?.toLowerCase().includes('valueset')) {
        valueSets.add(relatedArtifact.resource);
      }
    }
  }

  for (const action of planDefinition.action) {
    // TODO: anywhere else that value sets can be referenced?
    // currently this only looks at PlanDef.action.input.codeFilter.valueSet

    if (action.input) {
      for (const input of action.input) {
        if (input.codeFilter) {
          for (const codeFilter of input.codeFilter) {
            if (codeFilter.valueSet) {
              valueSets.add(codeFilter.valueSet);
            }
          }
        }
      }
    }
  }

  for (const vs of valueSets) {
    let vsResource;

    if (bundle) {
      vsResource = bundle.entry.find(
        e => e.resource.resourceType === 'ValueSet' && e.resource.url === vs
      );
    }

    if (!vsResource) {
      const kaSearch = await getResources(url, 'ValueSet', `url=${vs}`);
      if (kaSearch?.entry) {
        vsResource = kaSearch.entry[0].resource;
      }
    }

    if (vsResource) {
      db.upsert(VALUESETS, vsResource, v => v.url === vsResource.url);
      debug(`ValueSet/${vsResource.url} saved to db`);
    } else {
      error(`Unable to locate ValueSet ${vs}`);
    }
  }
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
  fetchValueSets,
  getReceiverAddress,
  refreshAllKnowledgeArtifacts,
  refreshKnowledgeArtifact
};
