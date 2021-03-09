const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken } = require('./client');
const debug = require('../storage/logs').debug('medmorph-backend:fhir');
const error = require('../storage/logs').error('medmorph-backend:fhir');
const db = require('../storage/DataAccess');
const { getEHRServer } = require('../storage/servers');
const { generateToken } = require('./auth');
const { SUBSCRIPTIONS, SERVERS } = require('../storage/collections');

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
const RECEIVER_ADDRESS_EXT =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-receiverAddress';

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
 * Helper method to GET resources (and all included references) from a FHIR server and
 * save them to the database.
 *
 * @param {string} server - the sourse server base url
 * @param {string} resourceType - the type of the resource
 * @returns axios promise of FHIR bundle of resources
 */
async function getResources(server, resourceType) {
  const url = `${server}/${resourceType}?_include=*`;
  const token = await getAccessToken(server, db);
  const headers = { Authorization: `Bearer ${token}` };
  const axiosResponse = axios
    .get(url, { headers: headers })
    .then(response => response.data)
    .catch(err => error(err));
  return axiosResponse.then(data => {
    debug(`Fetched ${server}/${data.resourceType}/${data.id}`);
    if (!data.entry) return;
    const resources = data.entry.map(entry => entry.resource);
    resources.forEach(resource => {
      debug(`Extracted ${resource.resourceType}/${resource.id} from bundle`);
      const collection = `${resource.resourceType.toLowerCase()}s`;
      db.upsert(collection, resource, r => r.id === resource.id);
    });

    return data;
  });
}

/**
 * Helper method to create a Subscription resource
 *
 * @param {string} criteria - the criteria for the named event code
 * @param {string} url - the notification endpoint url
 * @param {string} id - the id to assign the Subscription
 * @param {string} subscriptionTopic - R5 backport subscription topic
 * @returns a R5 Backport Subscription
 */
function generateSubscription(criteria, url, id = undefined, subscriptionTopic = undefined) {
  // Add regex to check if criteria has at least one search param since HAPI is expecting this
  const criteriaReg = /(.+)(\?)+/;
  const subId = id ?? `sub${uuidv4()}`;
  const subscription = {
    id: subId,
    resourceType: 'Subscription',
    criteria: criteriaReg.test(criteria) ? `${criteria}` : `${criteria}?`,
    status: 'requested',
    channel: {
      type: 'rest-hook',
      endpoint: url,
      payload: 'application/fhir+json',
      header: [`Authorization: Bearer ${generateToken(subId)}`]
    }
  };

  // Add R5 Backport properties if required
  if (subscriptionTopic) {
    subscription.meta = {
      profile: [BACKPORT_SUBSCRIPTION_PROFILE]
    };
    subscription.extension = [
      {
        url: BACKPORT_TOPIC_EXTENSION,
        valueUri: `http://example.org/medmorph/subscriptiontopic/${subscriptionTopic}`
      }
    ];
    subscription._payload = {
      extension: [
        {
          url: BACKPORT_PAYLOAD_EXTENSION,
          valueCode: 'full-resource'
        }
      ]
    };
  }

  // Fix the criteria for Medication by adding all criteria
  if (criteria === 'Medication') {
    // Multiple criteria indicates logical OR
    subscription.criteria = 'MedicationRequest?_lastUpdated=gt2021-01-01';
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
    // Create/Update subscriptions from PlanDefinitions
    if (bundle) subscriptionsFromBundle(bundle);
  });
  getResources(server.endpoint, 'Endpoint');
}

/**
 * Subscribe to PlanDefinitions on all Knowledge Artifact repos.
 */
function subscribeToKnowledgeArtifacts() {
  const servers = db.select(SERVERS, s => s.type === 'KA');
  servers.forEach(async server => {
    const id = `sub${server.id}`;
    const subscription = generateSubscription(
      'PlanDefinition',
      `${process.env.BASE_URL}/notif/ka/${server.id}`,
      id
    );
    db.upsert(SUBSCRIPTIONS, subscription, s => s.id === subscription.id);
    const token = await getAccessToken(server.endpoint);
    const headers = { Authorization: `Bearer ${token}` };
    axios
      .put(`${server.endpoint}/Subscription/${id}`, subscription, { headers: headers })
      .then(() => debug(`Subscription created for KA from ${server.name} at ${server.endpoint}`));
  });
}

/**
 * Take a Knowledge Artifact Bundle and generate Subscription resources for the named events
 * Saves Subscription resources to DB and posts them to EHR server
 *
 * @param {Bundle} specBundle - KA Bundle with PlanDefinition
 * @returns list of Subscription resources
 */
function subscriptionsFromBundle(specBundle) {
  const planDefs = specBundle.entry.filter(e => e.resource.resourceType === 'PlanDefinition');
  if (!planDefs.length) {
    throw new Error('Specification Bundle does not contain a PlanDefinition');
  }

  const subscriptions = planDefs.map(planDef => subscriptionsFromPlanDef(planDef.resource)).flat();

  postSubscriptionsToEHR(subscriptions);

  return subscriptions;
}

/**
 * Take a single PlanDefinition and generate a Subscription resource for the named events
 *
 * @param {PlanDefinition} planDef - KA PlanDefinition
 * @returns list of Subscription resources (one for each trigger on the first action).
 */
function subscriptionsFromPlanDef(planDef) {
  const action = planDef.action[0];

  if (action.trigger?.length === 0) return [];

  return action.trigger.reduce((subscriptions, trigger) => {
    const namedEventExt = trigger.extension.find(e => e.url === NAMED_EVENT_EXTENSION);
    const namedEventCoding = namedEventExt.valueCodeableConcept.coding.find(
      c => c.system === NAMED_EVENT_CODE_SYSTEM
    );

    const criteria = namedEventToCriteria(namedEventCoding.code);
    const id = `sub${planDef.id}${namedEventCoding.code}`;
    const notifUrl = `${process.env.BASE_URL}/notif/${planDef.id}`;
    if (criteria)
      subscriptions.push(generateSubscription(criteria, notifUrl, id, namedEventCoding.code));
    return subscriptions;
  }, []);
}

/**
 * Helper function to save subscriptions and post them to the EHR
 *
 * @param {Subscription[]} subscriptions - list of subscription resources
 */
function postSubscriptionsToEHR(subscriptions) {
  subscriptions.forEach(async subscription => {
    const subscriptionId = subscription.id;

    // Store subscriptions in database
    debug(`Saved Subscription/${subscriptionId}`);
    db.upsert('subscriptions', subscription, s => s.id === subscriptionId);

    // Create/Update Subscriptions on EHR server
    const ehrServer = getEHRServer();
    if (ehrServer) {
      const ehrToken = await getAccessToken(ehrServer.endpoint);
      const headers = { Authorization: `Bearer ${ehrToken}` };
      axios
        .put(`${ehrServer.endpoint}/Subscription/${subscriptionId}`, subscription, { headers })
        .then(() =>
          debug(`Subscription with id ${subscriptionId} created/updated on ${ehrServer.endpoint}`)
        );
    }
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

/**
 * Dereference a reference url. Currently only supports relative references.
 *
 * @param {string} url - base fhir url
 * @param {string} reference - the reference string
 * @returns the referenced resource
 */
async function getReferencedResource(url, reference) {
  if (reference.split('/').length === 2) {
    const [resourceType, id] = reference.split('/');
    const token = await getAccessToken(url);
    const headers = { Authorization: `Bearer ${token}` };
    const resource = await axios.get(`${url}/${resourceType}/${id}`, { headers: headers });
    debug(
      `Retrieved reference resource ${resource.data.resourceType}/${resource.data.id} from ${url}`
    );
    return resource.data;
  }

  // TODO: update to work with other reference types
  return null;
}

/**
 * Forward a message response to the EHR server
 *
 * @param {*} response - the message response to forward
 * @returns axios promise
 */
async function forwardMessageResponse(response) {
  const baseUrl = getEHRServer().endpoint;
  const token = await getAccessToken(baseUrl);
  const headers = { Authorization: `Bearer ${token}` };
  return axios.post(`${baseUrl}/$process-message`, response, { headers: headers });
}

/**
 * Extracts the Endpoint id from the receiver address extension of the PlanDefinition
 *
 * @param {PlanDefinition} planDefinition - PlanDefinition to extract from
 * @returns Endpoint id
 */
function getEndpointId(planDefinition) {
  const receiverAddress = planDefinition.extension.find(e => e.url === RECEIVER_ADDRESS_EXT);
  const endpointRef = receiverAddress.valueReference.reference;
  return endpointRef.split('/')[1];
}

module.exports = {
  generateOperationOutcome,
  refreshAllKnowledgeArtifacts,
  refreshKnowledgeArtifact,
  subscriptionsFromBundle,
  subscriptionsFromPlanDef,
  getReferencedResource,
  forwardMessageResponse,
  subscribeToKnowledgeArtifacts,
  postSubscriptionsToEHR,
  getEndpointId
};
