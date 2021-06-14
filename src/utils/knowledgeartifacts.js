const debug = require('../storage/logs').debug('medmorph-backend:knowledgeartifacts');
const error = require('../storage/logs').error('medmorph-backend:knowledgeartifacts');
const db = require('../storage/DataAccess');
const { subscriptionsFromBundle } = require('./subscriptions');
const { SERVERS, ENDPOINTS, VALUESETS, LIBRARIES } = require('../storage/collections');
const { EXTENSIONS, CODE_SYSTEMS, getResources, getReferencedResource } = require('./fhir');
const { compareUrl } = require('../utils/url');
const { registerServer } = require('./client');
const { getServerByUrl } = require('../storage/servers');

/**
 * Get all knowledge artifacts (from servers registered in the
 * db) and save them. Stores all referenced resources as well.
 */
function refreshAllKnowledgeArtifacts() {
  const servers = db.select(SERVERS, s => s.type === 'KA');
  servers.forEach(server => refreshKnowledgeArtifact(server.endpoint));
}

/**
 * Get knowledge artifacts from a specific server.
 *
 * @param {string} server - the server url to refresh artifacts from
 */
function refreshKnowledgeArtifact(server) {
  getResources(
    server,
    'PlanDefinition',
    '_include=*',
    'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-plandefinition'
  ).then(bundle => {
    if (bundle) {
      // Create/Update subscriptions from PlanDefinitions
      subscriptionsFromBundle(bundle, server);

      bundle.entry.forEach(async entry => {
        if (entry.resource.resourceType === 'PlanDefinition') {
          fetchEndpoint(server, entry.resource);
          fetchValueSets(server, entry.resource, bundle);
          fetchLibraries(server, entry.resource, bundle);
        }
      });
    }
  });
}

/**
 * Fetchs the referenced Endpoint from receiver address extension and saves to the database.
 * Will also attempt dynamic client registration if enabled in the config.
 *
 * @param {string} url - the url to fetch from
 * @param {PlanDefinition} planDefinition - PlanDefinition to get Endpoint from or null if
 *    receiver address does not exist
 */
function fetchEndpoint(url, planDefinition) {
  const endpointReference = getReceiverAddress(planDefinition);
  if (!endpointReference) return null;
  getReferencedResource(url, endpointReference, planDefinition, true).then(endpoint => {
    if (endpoint) {
      db.upsert(ENDPOINTS, endpoint, r => compareUrl(r.fullUrl, endpoint.fullUrl));
      debug(`Endpoint/${endpoint.resource.id} saved to db`);

      const baseUrl = endpoint.resource.address.split('/$process-message')[0];
      if (!getServerByUrl(baseUrl)) registerServer(baseUrl);
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
        e => e.resource.resourceType === 'ValueSet' && compareUrl(e.resource.url, vs)
      );
    }

    if (!vsResource) {
      const kaSearch = await getResources(url, 'ValueSet', `url=${vs}`);
      if (kaSearch?.entry) {
        vsResource = kaSearch.entry[0].resource;
      }
    }

    if (vsResource) {
      db.upsert(VALUESETS, vsResource, v => compareUrl(v.resource.url, vsResource.url));
      debug(`ValueSet/${vsResource.url} saved to db`);
    } else {
      error(`Unable to locate ValueSet ${vs} on ${url}`);
    }
  }
}

/**
 * Fetches any referenced Library resources from the planDefinition and saves to the database
 *
 * @param {string} url - fhir server base url to fetch from
 * @param {PlanDefinition} planDefinition - PlanDefinition to search for referenced Library
 * @param {Bundle} bundle - the Bundle the PlanDefinition was returned in,
 *                          in case it already contains the Library we want
 */
async function fetchLibraries(url, plandefinition, bundle) {
  const { library: libraryIds } = plandefinition;
  if (!libraryIds || libraryIds.length === 0) return;

  for (const id of libraryIds) {
    let libraryResource;

    if (bundle) {
      libraryResource = bundle.entry.find(
        e => e.resource.resourceType === 'Library' && e.resource.id === id
      );
    }

    if (!libraryResource) {
      const kaSearch = await getResources(url, 'Library', `_id=${id}`);
      if (kaSearch?.entry) {
        libraryResource = kaSearch.entry[0].resource;
      }
    }

    if (libraryResource) {
      const fullUrl = `${url}/Library/${id}`;
      db.upsert(LIBRARIES, { fullUrl, resource: libraryResource }, l => l.resource.id === id);
      debug(`Library/${libraryResource.id} saved to db`);
    } else {
      error(`Unable to locate Library ${id} on ${url}`);
    }
  }
}

/**
 * Extracts the Endpoint reference from the receiver address extension of the PlanDefinition
 *
 * @param {PlanDefinition} planDefinition - PlanDefinition to extract from
 * @returns reference string or null
 */
function getReceiverAddress(planDefinition) {
  if (!planDefinition.extension) {
    error(
      `PlanDefinition/${planDefinition.id} does not have extensions. Cannot get receiver address.`
    );
    return null;
  }
  const receiverAddress = planDefinition.extension.find(e =>
    compareUrl(e.url, EXTENSIONS.RECEIVER_ADDRESS)
  );
  return receiverAddress ? receiverAddress.valueReference.reference : null;
}

/**
 * Extracts the NamedEvent trigger code from the first action of the PlanDefinition
 *
 * @param {PlanDefinition} planDefinition - PlanDefinition to extract from
 * @returns NamedEvent Trigger Code or null
 */
function getNamedEventTriggerCode(planDefinition) {
  const action = planDefinition.action.find(a => {
    return a.code[0].coding.find(
      coding =>
        coding.system === CODE_SYSTEMS.PLANDEF_ACTION &&
        coding.code === 'initiate-reporting-workflow'
    );
  });

  const errorText = `PlanDefinition/${planDefinition.id} initiate-reporting-workflow action`;
  //
  if (!action) {
    error(`${errorText} does not exist`);
    return null;
  } else if (action.trigger?.length === 0) {
    error(`${errorText} does not have a trigger`);
    return null;
  } else if (!action.trigger[0].extension) {
    error(`${errorText} does not have a trigger extension`);
    return null;
  }

  const namedEventExt = action.trigger[0].extension.find(e =>
    compareUrl(e.url, EXTENSIONS.NAMED_EVENT)
  );
  if (!namedEventExt) {
    error(`${errorText} does not have a named event trigger`);
    return null;
  }

  const namedEventCoding = namedEventExt.valueCodeableConcept.coding.find(
    c => c.system === CODE_SYSTEMS.NAMED_EVENT
  );

  return namedEventCoding?.code;
}

module.exports = {
  fetchEndpoint,
  fetchLibraries,
  fetchValueSets,
  getReceiverAddress,
  getNamedEventTriggerCode,
  refreshAllKnowledgeArtifacts,
  refreshKnowledgeArtifact
};
