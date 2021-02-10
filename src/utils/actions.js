// this file provides functions for various action codes
// it is assumed every function recieves a "context" object
// Context:
//  Patient: identifier for the patient whose data triggered the workflow
//  records: list of records
//  Encounter: encounter where some data triggered the workflow
//  PlanDef: *** do we want to keep a "pre-processed" version of the plandef?
//  Action: action currently in context from the planDef
//  messageHeader: info about the message
//  client: set of clients to connect to
//      source: FHIR client to make additional queries to EHR
//      dest: FHIR client to send to PHA/TTP
//      trust services
//      database
//  reportingBundle: the entire bundle to be submitted
//  contentBundle: just the content section of the report bundle
//  next: place to put arbitrary objects specifically for the next step?
//  prev: where arbitrary objects from the previous set should go?
//  flags: various boolean or enum flags about the status of the report. is it encrypted y/n, is it identifiable or de/pseudo/anonymized, etc
//  cancelToken: indicates the job should be cancelled (from a process external to the job itself -- this tells the job to cease processing)
//  exitStatus: if set, terminates the job and marks it with the given status (for example, if a given patient doesn't meet reporting criteria, don't keep reporting)

// we assume the context updates and is passed to functions
// in turn.  I'm also assuming the context is unique
// to the current action, since we'd be cycling through actions
// anyway.
const Fhir = require('fhir').Fhir;
const FhirPath = require('fhir').FhirPath;
const fhir = new Fhir();
const baseIgActions = {
  'check-trigger-codes': context => {
    const action = context.action;
    const resources = context.records;

    const boolMap = action.condition.map(condition => {
      if (condition.kind === 'applicability' && condition.expression) {
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
    return null;
  },
  'create-report': context => {
    // the output might define a profile
    let profile = null;
    if (context.action.output) {
      const output = context.action.output[0];
      if (output.profile) {
        profile = output.profile[0];
      }
    }
    let contentBundle = createBundle(context.records);
    if (profile) {
      contentBundle = validateProfile(contentBundle, profile);
    }
    const header = makeHeader();
    context.contentBundle = contentBundle;
    context.reportingBundle = createBundle([header, ...contentBundle.entry]);
  },
  'validate-report': context => {
    // check if fhir is well-formed
    const validation = fhir.validate(context.reportingBundle);
    context.flags['valid'] = validation.valid;
  },
  'submit-report': context => {
    context.client.dest.submit(context.reportingBundle);
  },
  'deidentify-report': context => {
    const client = context.client.trustServices;
    client.deidentify(context.reportingBundle).then(result => {
      context.reportingBundle = result;
    });
    context.flags['deidentified'] = true;
  },
  'anonymize-report': context => {
    const client = context.client.trustServices;
    client.anonymize(context.reportingBundle).then(result => {
      context.reportingBundle = result;
    });
    context.flags['anonymized'] = true;
  },
  'pseudonymize-report': context => {
    const client = context.client.trustServices;
    client.pseudonymize(context.reportingBundle).then(result => {
      context.reportingBundle = result;
    });
    context.flags['pseudonymized'] = true;
  },
  'encrypt-report': context => {
    // noop
    context.flags['encrypted'] = true;
  },
  'complete-reporting': context => {
    context.client.db.insert('completed reports', context.reportingBundle);
  },
  'extract-research-data': context => {
    // assume information about desired research data
    // is in the action.input element
    const inputs = context.action.input;
    const client = context.client.source;
    if (inputs) {
      inputs.forEach(input => {
        // each input would define a different fhir resource
        const resourceType = input.type;
        // assume subjectReference might constrain the search
        const reference = input.subjectReference?.reference;
        let uri = `${resourceType}?`;
        if (reference) {
          uri += `subject=${reference}&`;
        }
        const resources = client.read(uri);
        const dateFilter = input.dateFilter;
        const filteredResources = [];
        // TODO: some of the filtering could
        // be done with search params in the query

        if (dateFilter) {
          // assume two filters don't overlap
          const path = dateFilter.path;
          const searchParam = dateFilter.searchParam;
          const filterPeriod = dateFilter.valuePeriod; // assume its a valuePeriod
          if (path) {
            const dateFiltered = resources.filter(resource => {
              // get value by path
              const date = getByPath(resource, path); // assume its a datetime?
              return compareDates(date, filterPeriod);
            });
            filteredResources.push.apply(filteredResources, dateFiltered);
          } else {
            // path or searchParam are required
            const dateFiltered = resources.filter(resource => {
              // get value by param
              const date = getBySearchParam(resource, searchParam); // assume its a datetime?
              return compareDates(date, filterPeriod);
            });
            filteredResources.push.apply(filteredResources, dateFiltered);
          }
        } else {
          // if there's no date filter, we can just push all the resources
          // in to be filtered by code
          filteredResources.push.apply(filteredResources, resources);
        }

        const codeFilter = input.codeFilter;
        if (codeFilter) {
          // code filter isn't under the same constraint as datefilter
          // we can assume that it's just a path
          const path = codefilter.path;
          const searchParam = codeFilter.searchParam;
          if (path) {
            // no need to refilter resources
            const filteredResources = filteredResources.filter(resource => {
              const code = getByPath(resource, path);
              return compareCodes(code, codeFilter.code); // codeFilter.code is of type Coding, could also be a valueSet?
            });
          } else if (searchParam) {
            const filteredResources = filteredResources.filter(resource => {
              const code = getBySearchParam(resource, searchParam);
              return compareCodes(code, codeFilter.code);
            });
          }
        }
        return context.records.push(filteredResources);
      });
    }
  },
  'execute-research-query': context => {
    // noop
  }
};

function validateProfile(report, structureDefinition) {
  // TODO: Perhaps this is something one of the servers/clients would handle?
  return report;
}

function getByPath(resource, path) {
  // TODO: function to search resources by path
  // and return correct attribute
  return resource;
}

function compareCodes(coding1, coding2) {
  // assume they're both coding
  return coding1.code === coding2.code && coding1.system === coding2.system;
}

function getBySearchParam(resource, searchParam) {
  // TODO: function to search resources by param
  // and return correct attribute
  return resource.date;
}

function compareDates(period1, period2) {
  // TODO: returns true if the periods overlap
}
function createBundle(records) {
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: []
  };

  records.forEach(record => {
    bundle.push({
      resource: record
    });
  });

  return bundle;
}

function getPatient(context) {
  const patientId = context.patient;
  const patient = context.client.source.read(patientId);
  context.patient = patient;
  return context;
}

function evaluateExpression(expression, resource) {
  if (expression.language === 'text/fhirpath') {
    const fhirpath = new FhirPath(resource);
    const path = fhirpath.evaluate(expression.expression);
    return path;
  }
}

function makeHeader(profile) {
  let header = {
    resourceType: 'MessageHeader',
    eventCoding: {
      system: 'http://example.org/fhir/message-events',
      code: 'placeholder'
    }
  };
  if (profile) {
    header = validateProfile(header, profile);
  }
  return header;
}
