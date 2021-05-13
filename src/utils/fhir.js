const axios = require('axios');
const { getAccessToken } = require('./client');
const debug = require('../storage/logs').debug('medmorph-backend:fhir');
const error = require('../storage/logs').error('medmorph-backend:fhir');
const db = require('../storage/DataAccess');
const { getEHRServer } = require('../storage/servers');
const { SERVERS, PLANDEFINITIONS } = require('../storage/collections');

const EXTENSIONS = {
  NAMED_EVENT: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType',
  BACKPORT_TOPIC:
    'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-topic-canonical',
  BACKPORT_PAYLOAD:
    'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-payload-content',
  BACKPORT_ADDITIONAL_CRITERIA:
    'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-additional-criteria',
  RECEIVER_ADDRESS: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-receiverAddress'
};

const PROFILES = {
  BACKPORT_SUBSCRIPTION:
    'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-subscription'
};

const CODE_SYSTEMS = {
  NAMED_EVENT: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents'
};

/**
 * Helper method to create an OperationOutcome with a message
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
 * @param {string} query - any query to append to the search. default "_include-*"
 * @returns axios promise of FHIR bundle of resources
 */
async function getResources(server, resourceType, query = '_include=*') {
  const url = `${server}/${resourceType}?${query}`;
  const token = await getAccessToken(server, db);
  const headers = { Authorization: `Bearer ${token}` };
  const axiosResponse = axios
    .get(url, { headers: headers })
    .then(response => response.data)
    .catch(err => error(`Error getting ${url}\n${err.message}`));
  return axiosResponse.then(data => {
    debug(`Fetched ${server}/${data.resourceType}/${data.id}`);
    if (!data.entry) return;
    const resources = data.entry.map(entry => entry.resource);
    resources.forEach(resource => {
      debug(`Extracted ${resource.resourceType}/${resource.id} from bundle`);
      const collection = `${resource.resourceType.toLowerCase()}s`;
      const fullUrl = `${server}/${resource.resourceType}/${resource.id}`;
      db.upsert(collection, { fullUrl, ...resource }, r => r.fullUrl === fullUrl);
    });

    return data;
  });
}

/**
 * Dereference a reference url. Currently only supports relative references.
 *
 * @param {string} url - base fhir url
 * @param {string} reference - the reference string
 * @param {Resource} parentResource - the parent resource where a contained reference would live
 * @param {boolean} returnFullUrl - will append the fullUrl to the returned resource. Default false.
 * @returns the referenced resource
 */
async function getReferencedResource(url, reference, parentResource, returnFullUrl = false) {
  const headers = {};
  let requestUrl = reference;
  if (reference.split('/').length === 2) {
    // Relative reference so resource is on the url server
    const [resourceType, id] = reference.split('/');
    const token = await getAccessToken(url);
    requestUrl = `${url}/${resourceType}/${id}`;
    headers.Authorization = `Bearer ${token}`;
  } else if (reference[0] === '#') {
    return parentResource.contained.find(r => r.id === reference.split('#')[1]);
  } else {
    // Absolute reference - if we are registered with the server obtain an access token
    // Assumes the url is of the form {baseUrl}/{resourceType}/{id}
    const externalServerUrl = getBaseUrlFromFullUrl(reference);
    const found = db.select(SERVERS, s => s.endpoint === externalServerUrl);
    if (found.length) {
      const token = await getAccessToken(externalServerUrl);
      headers.Authorization = `Bearer ${token}`;
    } else {
      debug(`Unable to find server with endpoint ${externalServerUrl} in the database.`);
      debug('Attempting to get referenced resource without using authorization');
    }
  }

  const resource = await axios
    .get(requestUrl, { headers: headers })
    .then(response => {
      if (returnFullUrl) return { fullUrl: requestUrl, ...response.data };
      else return response.data;
    })
    .catch(err => error(`Error getting referenced resource ${requestUrl}\n${err.message}`));
  if (resource) {
    debug(`Retrieved reference resource ${resource.resourceType}/${resource.id} from ${url}`);
    return resource;
  } else return null;
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
 * Extracts the baseUrl from the fullUrl. Assumes the fullUrl is in the form
 *  {baseUrl}/{resourceType}/{id}
 *
 * @param {string} fullUrl - the fullUrl
 * @returns the base url
 */
function getBaseUrlFromFullUrl(fullUrl) {
  const temp = fullUrl.substring(0, fullUrl.lastIndexOf('/'));
  return temp.substring(0, temp.lastIndexOf('/'));
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

/**
 * Helper function to save subscriptions and post them to the EHR
 *
 * @param {Subscription[]} subscriptions - list of subscription resources
 */
function postSubscriptionsToEHR(subscriptions) {
  subscriptions.forEach(async subscription => {
    const ehrServer = getEHRServer();
    if (ehrServer) {
      const subscriptionId = subscription.id;
      const fullUrl = `${ehrServer.endpoint}/Subscription/${subscriptionId}`;

      // Store subscriptions in database
      debug(`Saved Subscription/${subscriptionId}`);
      db.upsert('subscriptions', { fullUrl, ...subscription }, s => s.fullUrl === fullUrl);

      // Create/Update Subscriptions on EHR server
      const ehrToken = await getAccessToken(ehrServer.endpoint);
      const headers = {
        Authorization: `Bearer ${ehrToken}`,
        'Content-Type': 'application/fhir+json'
      };
      axios
        .put(fullUrl, subscription, { headers })
        .then(() =>
          debug(`Subscription with id ${subscriptionId} created/updated on ${ehrServer.endpoint}`)
        )
        .catch(err =>
          error(`Error posting Subscription/${subscriptionId} to EHR.\n${err.message}`)
        );
    }
  });
}

/**
 * Deletes the subscription resource from EHR
 *
 * @param {Subscription} subscription - Subscription resource to delete
 */
async function deleteSubscriptionFromEHR(subscription) {
  const { fullUrl, resourceType } = subscription;

  if (resourceType === 'Subscription' && fullUrl) {
    const ehrServer = getEHRServer();

    if (ehrServer.endpoint === getBaseUrlFromFullUrl(fullUrl)) {
      const token = await getAccessToken(getBaseUrlFromFullUrl(fullUrl), db);
      const headers = { Authorization: `Bearer ${token}` };
      axios.delete(fullUrl, { headers });
      debug(`Deleted resource from ${fullUrl}`);
    }
  }
}

module.exports = {
  EXTENSIONS,
  PROFILES,
  CODE_SYSTEMS,
  deleteSubscriptionFromEHR,
  forwardMessageResponse,
  generateOperationOutcome,
  getBaseUrlFromFullUrl,
  getPlanDef,
  getResources,
  getReferencedResource,
  postSubscriptionsToEHR
};
