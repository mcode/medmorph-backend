const axios = require('axios');
const debug = require('debug')('medmorph-backend:server');

const NAMED_EVENT_EXTENSION =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType';
const NAMED_EVENT_CODE_SYSTEM =
  'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents';
const BACKPORT_SUBSCRIPTION_PROFILE =
  'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-subscription';
const BACKPORT_TOPIC_EXTENSION =
  'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-topic-canonical';
const BACKPORT_PAYLOAD_EXTENSION =
  'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-payload-content';
const BACKPORT_ADDITIONAL_CRITERIA_EXTENSION =
  'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-additional-criteria';

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
 * Helper method to create a Subscription resource
 *
 * @param {string} code - named event code
 * @param {string} criteria - the criteria for the named event code
 * @param {string} url - the notification endpoint url
 * @param {string} token - access token for header
 * @returns a R5 Backport Subscription
 */
function generateSubscription(code, criteria, url, token) {
  const subscription = {
    resourceType: 'Subscription',
    meta: {
      profile: [BACKPORT_SUBSCRIPTION_PROFILE]
    },
    extension: [
      {
        url: BACKPORT_TOPIC_EXTENSION,
        valueUri: `http://example.org/medmorph/subscriptiontopic/${code}`
      }
    ],
    criteria: `${criteria}`,
    channel: {
      type: 'rest-hook',
      endpoint: url,
      payload: 'application/fhir+json',
      _payload: {
        extension: [
          {
            url: BACKPORT_PAYLOAD_EXTENSION,
            valueCode: 'full-resource'
          }
        ]
      },
      header: [`Authorization: Bearer ${token}`]
    }
  };

  // Fix the criteria for Medication by adding all criteria
  if (criteria === 'Medication') {
    // Multiple criteria indicates logical OR
    subscription.criteria = 'MedicationRequest';
    subscription._criteria = [
      {
        url: BACKPORT_ADDITIONAL_CRITERIA_EXTENSION,
        valueString: 'MedicationDispense'
      },
      {
        url: BACKPORT_ADDITIONAL_CRITERIA_EXTENSION,
        valueString: 'MedicationStatement'
      },
      {
        url: BACKPORT_ADDITIONAL_CRITERIA_EXTENSION,
        valueString: 'MedicationAdministration'
      }
    ];
  }

  return subscription;
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

    const criteria = namedEventToCriteria(namedEventCoding.code);
    if (criteria) return generateSubscription(namedEventCoding.code, criteria, url, token);
  });
}

/**
 * Take a named event code and generate the Subscription.criteria string. This will
 * not always be a FHIR resource. Since the medication codes map to multiple resources
 * only 'Medication' is returned and then all the resources are added to the criteria
 * when the Subscription resource is created.
 *
 * When a Subscription is not applicable (i.e. manual-notification) then null is returned.
 *
 * @param {string} code - the named event code
 * @returns the Subscription.criteria string or null if Subscription is not applicable
 */
function namedEventToCriteria(code) {
  const parts = code.split('-');

  let resource;
  if (parts[0] === 'new' || parts[0] === 'modified') resource = parts[1];
  else if (parts[1] === 'change' || parts[1] === 'start' || parts[1] === 'close')
    resource = parts[0];
  else return null;

  switch (resource) {
    case 'encounter':
      return 'Encounter';
    case 'diagnosis':
      return 'Condition';
    case 'medication':
      return 'Medication';
    case 'labresult':
      return 'Observation?category=laboratory';
    case 'order':
      return 'ServiceRequest';
    case 'procedure':
      return 'Procedure';
    case 'immunization':
      return 'Immunization';
    case 'demographic':
      return 'Patient';
    default:
      return null;
  }
}

module.exports = {
  generateOperationOutcome,
  refreshKnowledgeArtifacts,
  subscriptionsFromBundle,
  subscriptionsFromPlanDef
};
