// this file provides functions for various action codes
// it is assumed every function recieves a "context" object
// Context:
//  Patient: patient whose data triggered the workflow
//  records: list of records
//  Encounter: encounter where some data triggered the workflow
//  Organization: Organization that is doing the workflow
//  PlanDef: *** do we want to keep a "pre-processed" version of the plandef?
//  Action: action currently in context from the planDef
//  client: set of clients to connect to
//      dest: endpoint of where to send to PHA/TTP
//      trust services
//      db
//  reportingBundle: the entire bundle to be submitted
//  contentBundle: just the content section of the report bundle
//  flags: various boolean or enum flags about the status of the report.
//         is it encrypted y/n, is it identifiable or de/pseudo/anonymized, etc
//  cancelToken: indicates the job should be cancelled (from a process external
//         to the job itself -- this tells the job to cease processing)
//  exitStatus: if set, terminates the job and marks it with the given status
//         (for example, if a given patient doesn't meet reporting criteria, don't keep reporting)

// we assume the context updates and is passed to functions
// in turn.  I'm also assuming the context is unique
// to the current action, since we'd be cycling through actions
// anyway.
const axios = require('axios');
const { v4: uuid } = require('uuid');
const { Fhir } = require('fhir');
const fhirpath = require('fhirpath');
const { StatusCodes } = require('http-status-codes');
const { getEHRServer } = require('../storage/servers');
const { getAccessToken } = require('./client');
const db = require('../storage/DataAccess');
const configUtil = require('../storage/configUtil');
const { forwardMessageResponse } = require('./fhir');
const { COMPLETED_REPORTS, VALUESETS } = require('../storage/collections');
const { checkCodeInVs } = require('./valueSetUtils');
const { compareUrl } = require('../utils/url');
const debug = require('../storage/logs').debug('medmorph-backend:actions');
const error = require('../storage/logs').error('medmorph-backend:actions');
const fhir = new Fhir();

const baseIgActions = {
  'check-trigger-codes': async context => {
    const action = context.action;
    const resources = context.records;
    const variables = {};
    if (action.input) {
      for (const input of action.input) {
        const { id, codeFilter, type } = input;

        const params = [];
        if (context.encounter) {
          params.push(`encounter=Encounter/${context.encounter.id}`);
        }

        if (context.patient) {
          params.push(`subject=Patient/${context.patient.id}`);
        }

        const query = type + '?' + params.join('&');
        const bundle = (await readFromEHR(query)).data;
        let results = [];

        if (bundle.entry) {
          results = bundle.entry.map(e => e.resource);

          if (codeFilter) {
            // Can there be multiple codeFilters?
            const { path, valueSet } = codeFilter[0];
            const vsResource = db.select(VALUESETS, v => compareUrl(v.url, valueSet))[0];
            // Filter resources that are in valueSet
            results = results.filter(r =>
              r[path].coding.some(c => checkCodeInVs(c.code, c.system, vsResource))
            );
          }
        }

        variables[id] = results;
      }
    }

    const boolMap = action.condition.map(condition => {
      if (condition.expression) {
        const expression = condition.expression;
        return evaluateExpression(expression, resources, variables);
      } else {
        // default true for non-applicability conditions
        return true;
      }
    });
    // boolMap should be all-true (all conditions met)
    const triggered = boolMap.every(entry => {
      return entry === true;
    });
    context.flags['triggered'] = triggered;
    if (!triggered) {
      context.exitStatus = 'failed trigger check';
    }
  },
  'check-participant-registration': context => {
    // TODO: how do we check the participant registration?
    // Through the source client?
    return context;
  },
  'create-report': async context => {
    // the output might define a profile
    const action = context.action;

    if (action.input) {
      // input field defines which resource types to include

      const fetchPromises = [];

      for (const input of action.input) {
        const resourceType = input.type;
        // ASSUMPTION: only types that are linked to a patient will be included here
        // so for example Substance resources, which represent a Thing rather than an activity
        // should not be here
        const params = [];

        // worth making this a switch instead of if?
        if (resourceType === 'Patient') {
          // we should always have the patient resource already included
          // (see reporting_workflow:initializeContext)
          // so skip the rest of the logic below
          continue;
        } else if (resourceType === 'Encounter') {
          if (context.encounter) {
            // we already added the encounter resource directly
            // (see reporting_workflow:initializeContext)
            // ASSUMPTION: if given an encounter context,
            //   we only care about that one, not all encounters
            continue;
          } else {
            // we always have context.patient
            params.push(`subject=Patient/${context.patient.id}`);
          }
        } else {
          // TODO: logic to check which resources actually have these fields?
          // will be necessary if we get away from the simple US core types
          if (context.encounter) {
            params.push(`encounter=Encounter/${context.encounter.id}`);
          }

          if (context.patient) {
            params.push(`subject=Patient/${context.patient.id}`);
          }
        }

        // intentionally disabling the profile check for now
        // as a profile search isn't aware of profiles that logically extend one another
        // unless every profile in the hierarchy is explicitly listed
        // (for instance, mCODE profiles generally extend US Core,
        // but unless an mCODE resource also specifies US core
        // it won't be returned in a search by US core profile)
        // if (input.profile) {
        //   // TODO: what if there's more than 1 profile listed? is that AND or OR?
        //   // TODO: what if the server doesn't include profiles or support the search filter?
        //   params.push(`_profile=${input.profile[0]}`);
        //   // note also specifying profile may not be ideal

        // eslint-disable-next-line max-len
        //   // see: https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Requiring.20meta.2Eprofile.20be.20populated
        // }

        const query = resourceType + '?' + params.join('&');
        fetchPromises.push(readFromEHR(query));
      }

      const fetchResults = await Promise.all(fetchPromises);
      for (const result of fetchResults) {
        const bundle = result.data;
        if (bundle.entry) {
          const resources = bundle.entry.map(e => e.resource);
          context.records.push(...resources);
        }
      }
    }

    let contentBundle = createBundle(context.records, 'content');
    if (context.action.output) {
      const output = context.action.output[0];
      if (output.profile) contentBundle = validateProfile(contentBundle, output.profile[0]);
    }
    const header = makeHeader(context);
    context.contentBundle = contentBundle;
    context.reportingBundle = createBundle([header, contentBundle], 'reporting');
  },
  'validate-report': context => {
    // check if fhir is well-formed
    const validation = fhir.validate(context.reportingBundle);
    context.flags['valid'] = validation.valid;
  },
  'submit-report': async context => {
    await submitBundle(context.reportingBundle, context.client.dest)
      .then(
        result => {
          if (result.status === StatusCodes.ACCEPTED || result.status === StatusCodes.OK) {
            context.flags['submitted'] = true;
            debug(`/Bundle/${context.reportingBundle.id} submitted to ${context.client.dest}`);

            if (result.data?.resourceType === 'Bundle') {
              forwardMessageResponse(result.data).then(() =>
                debug(`Response to /Bundle/${context.reportingBundle.id} forwarded to EHR`)
              );
            }
          }
        },
        () => {
          context.flags['submitted'] = false;
        }
      )
      .catch(err => {
        const bundleId = context.reportingBundle.id;
        error(`Error submitting Bundle/${bundleId} to ${context.client.dest}\n${err.message}`);
        context.flags['submitted'] = false;
      });
  },
  'deidentify-report': async context => {
    await dataTrustOperation('deidentify', context.reportingBundle)
      .then(
        result => {
          context.reportingBundle = result.data;
          context.flags['deidentified'] = true;
        },
        () => {
          context.flags['deidentified'] = false;
        }
      )
      .catch(err => {
        error(`Error deidentifying Bundle/${context.reportingBundle.id}\n${err.message}`);
        context.flags['deidentified'] = false;
      });
  },
  'anonymize-report': async context => {
    await dataTrustOperation('anonymize', context.reportingBundle)
      .then(
        result => {
          context.reportingBundle = result.data;
          context.flags['anonymized'] = true;
        },
        () => {
          context.flags['anonymized'] = false;
        }
      )
      .catch(err => {
        error(`Error anonymizing Bundle/${context.reportingBundle.id}\n${err.message}`);
        context.flags['anonymized'] = false;
      });
  },
  'pseudonymize-report': async context => {
    await dataTrustOperation('pseudonymize', context.reportingBundle)
      .then(
        result => {
          context.reportingBundle = result.data;
          context.flags['pseudonymized'] = true;
        },
        () => {
          context.flags['pseudonymized'] = false;
        }
      )
      .catch(err => {
        error(`Error pseudonymizing Bundle/${context.reportingBundle.id}\n${err.message}`);
        context.flags['pseudonymized'] = false;
      });
  },
  'encrypt-report': context => {
    // noop
    context.flags['encrypted'] = true;
  },
  'complete-reporting': context => {
    db.insert(COMPLETED_REPORTS, context.reportingBundle);
    context.flags['completed'] = true;
  },
  'extract-research-data': async context => {
    // assume information about desired research data
    // is in the action.input element
    const inputs = context.action.input;
    if (inputs) {
      const listOfPromises = [];
      inputs.forEach(input => {
        // each input would define a different fhir resource
        const resourceType = input.type;
        // assume subjectReference might constrain the search
        const reference = input.subjectReference?.reference;
        let uri = `${resourceType}?`;
        if (reference) {
          uri += `subject=${reference}&`;
        }

        const getRecordsPromise = readFromEHR(uri).then(result => {
          debug(`/Bundle/${result.data.id} recieved from ${uri}`);
          const resources = result.data.entry.map(e => {
            const resource = e.resource;
            const collection = `${resource.resourceType.toLowerCase()}s`;
            const fullUrl = `${getEHRServer().endpoint}/${resource.resourceType}/${resource.id}`;
            db.upsert(collection, { fullUrl, ...resource }, r => compareUrl(r.fullUrl, fullUrl));
            return resource;
          });

          const dateFilter = input.dateFilter;
          let filteredResources = [...resources];
          // TODO: some of the filtering could
          // be done with search params in the query

          if (dateFilter) {
            // assume two filters don't overlap
            const path = dateFilter.path;
            const searchParam = dateFilter.searchParam;
            const filterPeriod = dateFilter.valuePeriod; // assume its a valuePeriod
            if (path) {
              filteredResources = filteredResources.filter(resource => {
                // get value by path
                const date = getByPath(resource, path); // assume its a datetime?
                return compareDates(date, filterPeriod);
              });
            } else {
              // path or searchParam are required
              filteredResources = filteredResources.filter(resource => {
                // get value by param
                const date = getBySearchParam(resource, searchParam); // assume its a datetime?
                return compareDates(date, filterPeriod);
              });
            }
          }

          const codeFilter = input.codeFilter;
          if (codeFilter) {
            // code filter isn't under the same constraint as datefilter
            // we can assume that it's just a path
            const path = codeFilter.path;
            const searchParam = codeFilter.searchParam;
            if (path) {
              // no need to refilter resources
              filteredResources = filteredResources.filter(resource => {
                const code = getByPath(resource, path);
                // codeFilter.code is of type Coding, could also be a valueSet?
                return compareCodes(code, codeFilter.code[0]);
              });
            } else if (searchParam) {
              filteredResources = filteredResources.filter(resource => {
                const code = getBySearchParam(resource, searchParam);
                return compareCodes(code, codeFilter.code);
              });
            }
          }

          return context.records.push(...filteredResources);
        });
        listOfPromises.push(getRecordsPromise);
      });

      await Promise.all(listOfPromises);
    }
  },
  'execute-research-query': context => {
    // noop
    return context;
  }
};

function validateProfile(report, structureDefinition) {
  // TODO: Perhaps this is something one of the servers/clients would handle?
  if (structureDefinition) {
    return report;
  }
}

function getByPath(resource, path) {
  return fhirpath.evaluate(resource, path);
}

function compareCodes(coding1, coding2) {
  // assume they're both coding
  return coding1.code === coding2.code && coding1.system === coding2.system;
}

function getBySearchParam(resource, searchParam) {
  // TODO: function to search resources by param
  // and return correct attribute
  return resource[searchParam];
}

function compareDates(date, period) {
  const now = Date.parse(date);
  const start = Date.parse(period.start);
  const end = Date.parse(period.end);
  return now > start && now < end;
}

function createBundle(records, type) {
  const now = new Date(Date.now());
  const bundle = {
    id: uuid(),
    resourceType: 'Bundle',
    meta: {
      lastUpdated: now.toISOString()
    },
    timestamp: now.toISOString(),
    entry: []
  };

  if (type === 'reporting') {
    bundle.meta['profile'] = [
      'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-reporting-bundle'
    ];
    bundle.type = 'message';
  } else if (type === 'content') {
    bundle.meta['profile'] = [
      'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-content-bundle'
    ];
    bundle.type = 'collection';
  }

  records.forEach(record => {
    bundle.entry.push({
      resource: record
    });
  });

  return bundle;
}

function evaluateExpression(expression, resources, variables = {}) {
  if (expression.language === 'text/fhirpath') {
    const path = fhirpath.evaluate(resources, expression.expression, variables);
    return isTrue(path);
  }
}

// FHIRPath helper. FHIRPath tends to return things that are JS truthy (like empty arrays)
// when we would expect a null or other falsy value instead
// TODO: reference the same function here and in mapper
// sourced from fhir-mapper:
// https://github.com/standardhealth/fhir-mapper/blob/master/src/utils/common.js#L46
function isTrue(arg) {
  if (Array.isArray(arg)) {
    return arg.find(i => isTrue(i));
  } else if (typeof arg === 'object') {
    // because Object.keys(new Date()).length === 0;
    // we have to do some additional checks
    // https://stackoverflow.com/a/32108184
    return arg && Object.keys(arg).length === 0 && arg.constructor === Object;
  } else if (typeof arg === 'string' && arg === 'false') {
    return false;
  }
  return arg;
}

function makeHeader(context) {
  const header = {
    resourceType: 'MessageHeader',
    extension: [
      {
        url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-messageProcessingCategory',
        valueCode: 'consequence'
      }
    ],
    eventCoding: {
      system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-messageheader-message-types',
      code: 'message-report'
    },
    destination: [
      {
        // assume client has some way to produce its endpoint
        endpoint: context.client.dest.endpoint
      }
    ],
    source: {
      endpoint: `${process.env.BASE_URL}/$process-message`
    },
    sender: {
      // would the org come from the plandef?
      reference: context.organization
    },
    reason: {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents',
          code: 'encounter-change' // any way to get this trigger code?
        }
      ]
    }
  };

  return header;
}

/**
 * Retrieve data from the EHR
 *
 * @param {string} uri - the search query for the data desired
 * @returns axios promise with data
 */
async function readFromEHR(uri) {
  const url = getEHRServer().endpoint;
  const token = await getAccessToken(url);
  const headers = { Authorization: `Bearer ${token}` };
  return axios.get(`${url}/${uri}`, { headers: headers });
}

/**
 * Post the reporting bundle to the endpoint designated in the PlanDefinition
 *
 * @param {Bundle} bundle - the reporting Bundle to submit
 * @param {string} url - the endpoint to post the report. Comes from context.dest.endpoint.
 * @returns axios promise with data
 */
async function submitBundle(bundle, url) {
  const baseUrl = url.split('/$process-message')[0];
  const token = await getAccessToken(baseUrl);
  const headers = { Authorization: `Bearer ${token}` };
  return axios.post(url, bundle, { headers: headers });
}

/**
 * Helper function to call specific operations on the data trust service server.
 *
 * @param {string} operation = 'deidentify' | 'anonymize' | 'pseudonymize'
 * @param {Bundle} bundle - the bundle to perform operation on
 * @returns axios promise with data
 */
function dataTrustOperation(operation, bundle) {
  return axios.post(`${configUtil.getDataTrustService()}/Bundle/$${operation}`, bundle);
}

module.exports = { baseIgActions };
