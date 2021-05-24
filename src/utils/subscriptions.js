const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken } = require('./client');
const debug = require('../storage/logs').debug('medmorph-backend:subscriptions');
const error = require('../storage/logs').error('medmorph-backend:subscriptions');
const db = require('../storage/DataAccess');
const { generateToken } = require('./auth');
const { SUBSCRIPTIONS, SERVERS } = require('../storage/collections');
const { EXTENSIONS, PROFILES, CODE_SYSTEMS, postSubscriptionsToEHR } = require('./fhir');
const { compareUrl } = require('../utils/url');
const base64url = require('base64url');

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
      profile: [PROFILES.BACKPORT_SUBSCRIPTION]
    };
    subscription.extension = [
      {
        url: EXTENSIONS.BACKPORT_TOPIC,
        valueUri: `http://example.org/medmorph/subscriptiontopic/${subscriptionTopic}`
      }
    ];
    subscription._payload = {
      extension: [
        {
          url: EXTENSIONS.BACKPORT_PAYLOAD,
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
        url: EXTENSIONS.BACKPORT_ADDITIONAL_CRITERIA,
        valueString: 'MedicationDispense'
      },
      {
        url: EXTENSIONS.BACKPORT_ADDITIONAL_CRITERIA,
        valueString: 'MedicationStatement'
      },
      {
        url: EXTENSIONS.BACKPORT_ADDITIONAL_CRITERIA,
        valueString: 'MedicationAdministration'
      }
    ];
  }

  return subscription;
}

/**
 * Subscribe to PlanDefinitions on all Knowledge Artifact repos.
 */
function subscribeToKnowledgeArtifacts() {
  const servers = db.select(SERVERS, s => s.type === 'KA');
  servers.forEach(async server => {
    const id = `sub${server.id}`;
    const endpoint = server.endpoint;
    const fullUrl = `${endpoint}/Subscription/${id}`;
    const subscription = generateSubscription(
      'PlanDefinition',
      `${process.env.BASE_URL}/notif/ka/${server.id}`,
      id
    );
    db.upsert(SUBSCRIPTIONS, { fullUrl, ...subscription }, s => compareUrl(s.fullUrl, fullUrl));
    const token = await getAccessToken(endpoint);
    const headers = { Authorization: `Bearer ${token}` };
    axios
      .put(`${endpoint}/Subscription/${id}`, subscription, { headers: headers })
      .then(() => debug(`Subscription created for KA from ${server.name} at ${endpoint}`))
      .catch(err =>
        error(`Unable to create Subscription for KA ${server.name} at ${endpoint}\n${err.message}`)
      );
  });
}

/**
 * Take a Knowledge Artifact Bundle and generate Subscription resources for the named events
 * Saves Subscription resources to DB and posts them to EHR server
 *
 * @param {Bundle} specBundle - KA Bundle with PlanDefinition
 * @param {string} serverUrl - the base url of the server the Bundle came from
 * @returns list of Subscription resources
 */
function subscriptionsFromBundle(specBundle, serverUrl) {
  const planDefs = specBundle.entry.filter(e => e.resource.resourceType === 'PlanDefinition');
  if (!planDefs.length) {
    throw new Error('Specification Bundle does not contain a PlanDefinition');
  }

  const subscriptions = planDefs
    .map(planDef => subscriptionsFromPlanDef(planDef.resource, serverUrl))
    .flat();

  postSubscriptionsToEHR(subscriptions);

  return subscriptions;
}

/**
 * Take a single PlanDefinition and generate a Subscription resource for the named events
 *
 * @param {PlanDefinition} planDef - KA PlanDefinition
 * @param {string} serverUrl - the base url of the server the PlanDef came from
 * @returns list of Subscription resources (one for each trigger on the first action).
 */
function subscriptionsFromPlanDef(planDef, serverUrl) {
  // TODO: make sure eveyrwhere which calls this passes in serverURL
  const action = planDef.action[0];

  if (action.trigger?.length === 0) return [];

  return action.trigger.reduce((subscriptions, trigger) => {
    if (!trigger?.extension) {
      error(`PlanDefinition/${planDef.id} does not have a trigger`);
      return subscriptions;
    }
    const namedEventExt = trigger.extension.find(e => compareUrl(e.url, EXTENSIONS.NAMED_EVENT));
    if (!namedEventExt) {
      error(`PlanDefinition/${planDef.id} does not have a named event trigger`);
      return subscriptions;
    }
    const namedEventCoding = namedEventExt.valueCodeableConcept.coding.find(
      c => c.system === CODE_SYSTEMS.NAMED_EVENT
    );

    const criteria = namedEventToCriteria(namedEventCoding.code);
    const id = `sub${planDef.id}${namedEventCoding.code}`;
    const planDefFullUrl = `${serverUrl}/PlanDefinition/${planDef.id}`;
    const notifUrl = `${process.env.BASE_URL}/notif/${base64url.encode(planDefFullUrl)}`;
    if (criteria)
      subscriptions.push(generateSubscription(criteria, notifUrl, id, namedEventCoding.code));
    return subscriptions;
  }, []);
}

/**
 * Returns subscriptions in local DB associated with plandef
 *
 * @param {String} fullUrl - fullUrl of PlanDefinition resource
 * @returns list of Subscription resources
 */
function getSubscriptionsFromPlanDef(fullUrl) {
  if (!fullUrl) return [];

  return db.select(SUBSCRIPTIONS, s => {
    const endpoint = s?.channel?.endpoint;

    if (!endpoint) return false;
    return compareUrl(fullUrl, base64url.decode(getLastPartOfPathFromUrl(endpoint)));
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
  const resourceType = namedEventToResourceType(code);

  if (resourceType === 'Observation') return 'Observation?category=laboratory';
  else return resourceType;
}

/**
 * Returns the last part of path from url
 * For notification endpoints this will be the base64 encoded fullUrl of the PlanDefinition
 *
 * @param {string} url
 * @returns {string} last part of path from url
 */
function getLastPartOfPathFromUrl(url) {
  return url.substring(url.lastIndexOf('/') + 1, url.length);
}

/**
 * Take a named event code and return the resource type the named event will subscribe to.
 * This is not quite the Subscription.criteria string but will be used to construct that.
 *
 * @param {string} namedEvent - the named event code
 * @returns the resource type which will trigger a notification for the named event
 */
function namedEventToResourceType(namedEvent) {
  const parts = namedEvent.split('-');

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
      return 'Observation';
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
 * Take a topic url and return the resource type the topic will subscribe to.
 *
 * @param {string} topicUrl - the canonical url for the topic
 * @returns the resource type which will trigger a notification for the named event
 */
function topicToResourceType(topicUrl) {
  const namedEvent = topicUrl.split('/').slice(-1)[0];
  return namedEventToResourceType(namedEvent);
}

module.exports = {
  getSubscriptionsFromPlanDef,
  subscriptionsFromBundle,
  subscriptionsFromPlanDef,
  subscribeToKnowledgeArtifacts,
  topicToResourceType
};
