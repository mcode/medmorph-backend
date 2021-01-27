const axios = require('axios');
const debug = require('debug')('medmorph-backend:server');

const NAMED_EVENT_EXTENSION =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType';
const NAMED_EVENT_CODE_SYSTEM =
  'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents';

/**
 * Helper method to create an OperationOutcome fwith a message
 *
 * @param {IssueType} code - the IssueType code
 * @param {string} msg - message to include in the text
 */
function generateOperationOutcome(code, msg) {
  return {
    resourceType: 'OperationOutcome',
    text: {
      status: 'generated',
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">ERROR</td><td>[]</td><td><pre>${msg}</pre></td>\n\t\t\t\t\t\n\t\t\t\t\n\t\t\t</tr>\n\t\t</table>\n\t</div>` // eslint-disable-line
    },
    issue: [
      {
        severity: 'error',
        code: code
      }
    ]
  };
}

/**
 * Helper method to GET resources (and all included references) from a FHIR server
 *
 * @param {string} server - the sourse server base url
 * @param {string} type - the type of the resource
 * @param {string[]} ids - (optional) list of ids to get
 * @returns promise of axios data
 */
function getResources(server, type, ids = null) {
  const id_param = ids ? `&_id=${ids.join(',')}` : '';
  const url = `${server}/${type}?_include=*${id_param}`;
  const headers = { Authorization: 'Bearer admin' }; // TODO: get an access token
  return axios
    .get(url, { headers: headers })
    .then(response => response.data)
    .catch(err => console.log(err));
}

/**
 * Get all knowledge artifacts (from servers registered in the config
 * file) and save them. Stores all refrenced resources as well.
 */
function refreshKnowledgeArtifacts(db) {
  const servers = db.select('servers', s => s.type === 'KA');
  servers.forEach(server => {
    getResources(server.endpoint, 'PlanDefinition').then(data => {
      debug(`Fetched ${server.endpoint}/${data.resourceType}/${data.id}`);
      if (data.entry?.length === 0) return;
      const resources = data.entry.map(entry => entry.resource);
      resources.forEach(resource => {
        const collection = `${resource.resourceType.toLowerCase()}s`;
        db.upsert(collection, resource, r => r.id === resource.id);
      });
    });
  });
}

/**
 * Take a Knowledge Artifact Bundle and generate Subscription resources for the named events
 *
 * @param {Bundle} specBundle - KA Bundle with PlanDefinition
 * @param {string} url - the notification endpoint url
 * @param {string} token - the authorization token for the Subscription notification
 * @returns list of Subscription resources
 */
function subscriptionsFromBundle(specBundle, url, token) {
  const planDefs = specBundle.entry.filter(e => e.resource.resourceType === 'PlanDefinition');
  if (!planDefs.length) {
    throw new Error('Specification Bundle does not contain a PlanDefinition');
  }

  return planDefs.map(planDef => subscriptionsFromPlanDef(planDef.resource, url, token)).flat();
}

/**
 * Take a single PlanDefinition and generate a Subscription resource for the named events
 *
 * @param {PlanDefinition} planDef - KA PlanDefinition
 * @param {string} url - the notification endpoint url
 * @param {string} token - the authorization token for the Subscription notification
 * @returns list of Subscription resources (one for each trigger on the first action).
 */
function subscriptionsFromPlanDef(planDef, url, token) {
  const action = planDef.action[0];

  if (action.trigger?.length === 0) return [];

  return action.trigger.map(trigger => {
    const namedEventExt = trigger.extension.find(e => e.url === NAMED_EVENT_EXTENSION);
    const namedEventCoding = namedEventExt.valueCodeableConcept.coding.find(
      c => c.system === NAMED_EVENT_CODE_SYSTEM
    );

    return {
      resourceType: 'Subscription',
      criteria: `${namedEventToCriteria(namedEventCoding.code)}`,
      channel: {
        type: 'rest-hook',
        endpoint: url,
        payload: 'application/fhir+json',
        header: `Authorization: Bearer ${token}`
      }
    };
  });
}

/**
 * Take a named event code and generate the Subscription.criteria string
 *
 * @param {string} code - the named event code
 * @returns the Subscription.criteria string
 */
function namedEventToCriteria(code) {
  const parts = code.split('-');

  let resource;
  if (parts[0] === 'new' || parts[0] === 'modified') resource = parts[1];
  else if (parts[1] === 'change') resource = parts[0];
  else console.log(code);
  console.log(resource);

  // TODO: implement this

  return resource === undefined ? code : resource;
}

// TODO: remove namedEventToCriteria from export
module.exports = {
  generateOperationOutcome,
  refreshKnowledgeArtifacts,
  subscriptionsFromBundle,
  subscriptionsFromPlanDef,
  namedEventToCriteria
};
