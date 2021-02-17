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
const { Fhir, FhirPath } = require('fhir');
const { StatusCodes } = require('http-status-codes');
const { connectToServer } = require('./client');

const fhir = new Fhir();

const baseIgActions = {
  'check-trigger-codes': context => {
    const action = context.action;
    const resources = context.records;

    const boolMap = action.action[0].condition.map(condition => {
      if (condition.expression) {
        const expression = condition.expression;
        // check the records for a trigger code
        return resources.some(resource => {
          //might have to check that this is non-empty here
          return evaluateExpression(expression, resource);
        });
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
  },
  'check-participant-registration': context => {
    // TODO: how do we check the participant registration?
    // Through the source client?
    return context;
  },
  'create-report': context => {
    // the output might define a profile
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
          }
        },
        () => {
          context.flags['submitted'] = false;
        }
      )
      .catch(() => {
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
      .catch(() => {
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
      .catch(() => {
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
      .catch(() => {
        context.flags['pseudonymized'] = false;
      });
  },
  'encrypt-report': context => {
    // noop
    context.flags['encrypted'] = true;
  },
  'complete-reporting': context => {
    context.client.db.insert('completed reports', context.reportingBundle);
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
          const resources = result.data.entry.map(e => e.resource);

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

          // QUESTION - should context have a mutex?
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
  const fhirpath = new FhirPath(resource);
  return fhirpath.evaluate(path);
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
  const bundle = {
    resourceType: 'Bundle',
    meta: {
      lastUpdated: Date.now()
    },
    timestamp: Date.now(),
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

function evaluateExpression(expression, resource) {
  if (expression.language === 'text/fhirpath') {
    const fhirpath = new FhirPath(resource);
    const path = fhirpath.evaluate(expression.expression);
    return path;
  }
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
  const url = process.env.EHR;
  const token = await connectToServer(url);
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
  const token = await connectToServer(url);
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
  return axios.post(`${process.env.DATA_TRUST_SERVICE}/Bundle/$${operation}`, bundle);
}

module.exports = { baseIgActions };
