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
//  encryptedBundle: the entire bundle, but encrypted into a binary resource
//  next: place to put arbitrary objects specifically for the next step?
//  prev: where arbitrary objects from the previous set should go?
//  flags: various boolean or enum flags about the status of the report. is it encrypted y/n, is it identifiable or de/pseudo/anonymized, etc
//  cancelToken: indicates the job should be cancelled (from a process external to the job itself -- this tells the job to cease processing)
//  exitStatus: if set, terminates the job and marks it with the given status (for example, if a given patient doesn't meet reporting criteria, don't keep reporting)

// we assume the context updates and is passed to functions
// in turn.  I'm also assuming the context is unique
// to the current action, since we'd be cycling through actions
// anyway.

function checkTriggerCodes(context) {
  // are we checking the action or cycling through all actions in the plandef?
  const action = context.action;
  const triggers = action.trigger;
  const triggerCodes = [];
  triggers.map(trigger => {
    if (trigger.type === 'named-value' && trigger.extension) {
      const triggerEvents = trigger.extension.filter(ext => {
        return (
          ext.url === 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType'
        );
      });

      // TODO: What would the correct way to get
      // the code from the extension be?
      const triggerCode = triggerEvents.valueCode;
      if (triggerCode === 'encounter-change' || triggerCode === 'encounter-modified') {
        // these are basically the same, but encounter-change is lvl 0
        // not sure what that means for this
        triggerCodes.push(triggerCode); // no need to check the encounter here
      } else if (triggerCode === 'encounter-start') {
        if (context.encounter.period && context.encounter.period.low) {
          // TODO: check if it's past the start time?
          triggerCodes.push(triggerCode);
        }
      } else if (triggerCode === 'encounter-stop') {
        if (context.encounter.period && context.encounter.period.high) {
          // TODO: check if it's past the end time?
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'diagnosis-change' ||
        triggerCode === 'new-diagnosis' ||
        triggerCode === 'modified-diagnosis'
      ) {
        // not sure about this one, just check for a resource
        const conditions = context.records.filter(resource => {
          return resource.resourceType === 'Condition';
        });
        if (conditions.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'medication-change' ||
        triggerCode === 'new-medication' ||
        triggerCode === 'modified-medication'
      ) {
        // not sure about this one, just check for a resource
        const medications = context.records.filter(resource => {
          return (
            resource.resourceType === 'MedicationRequest' ||
            resource.resourceType === 'MedicationDispense' ||
            resource.resourceType === 'MedicationStatement' ||
            resource.resourceType === 'MedicationAdministration'
          );
        });
        if (medications.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'labresult-change' ||
        triggerCode === 'new-labresult' ||
        triggerCode === 'modified-labresult'
      ) {
        // not sure about this one, just check for a resource
        const observations = context.records.filter(resource => {
          return resource.resourceType === 'Observation';
        });
        if (observations.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'order-change' ||
        triggerCode === 'new-order' ||
        triggerCode === 'modified-order'
      ) {
        // not sure about this one, just check for a resource
        const orders = context.records.filter(resource => {
          return resource.resourceType === 'ServiceRequest';
        });
        if (orders.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'procedure-change' ||
        triggerCode === 'new-procedure' ||
        triggerCode === 'modified-procedure'
      ) {
        // not sure about this one, just check for a resource
        const procedures = context.records.filter(resource => {
          return resource.resourceType === 'Procedure';
        });
        if (procedures.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'immunization-change' ||
        triggerCode === 'new-immunization' ||
        triggerCode === 'modified-immunization'
      ) {
        // not sure about this one, just check for a resource
        const immunizations = context.records.filter(resource => {
          return resource.resourceType === 'Immunization';
        });
        if (immunizations.length > 0) {
          triggerCodes.push(triggerCode);
        }
      } else if (triggerCode === 'demographic-change') {
        // just make sure the patient has demographics?
        const patient = context.patient;
        if (
          patient.gender ||
          patient.birthDate ||
          patient.name ||
          patient.deceasedBoolean ||
          patient.address ||
          patient.telecom
        ) {
          triggerCodes.push(triggerCode);
        }
      } else if (
        triggerCode === 'received-public-health-report' ||
        triggerCode === 'received-public-health-response' ||
        triggerCode === 'manual-notification'
      ) {
        // no idea about these
        triggerCodes.push(triggerCode);
      }
    }
  });
  // assuming the flags are an object with keys
  // for each flag, and that we can put in
  // an array of fixed values.
  context.flags['triggerCodes'] = triggerCodes;
  return context;
}

function checkParticipantRegistration(context) {
  // assume the first action of the planDefinition includes
  // information about applicability conditions
  // TODO: Does the applicability condition need
  // to differentiate between patient/practitioner/encounter?
  // should the operating resources be put in the context separately?

  const planDef = context.planDef;
  if (planDef.condition) {
    // assume that if the condition is satisfied by one of the three
    // then it is satisfied
    const patient = context.patient;
    const encounter = context.encounter;
    const resources = [patient, encounter];
    const boolMap = planDef.condition.map(condition => {
      if (condition.kind === 'applicability' && condition.expression) {
        const expression = condition.expression;
        // does the condition need to be true for any or all resources?
        return resources.some(resource => {
          return evaluateExpression(expression, resource);
        });
      } else {
        return true;
      }
    });
  }
}

function createReport(context) {
  context.contentBundle = createBundle(context.records);
  const reportingBundle = createBundle(context.records);
  // assume the context has a messageHeader.
  reportingBundle.entry.unshift(context.messageHeader);
  context.reportingBundle = reportingBundle;
  return context;
}

function validateReport(context) {
  // assume that we're getting the validation
  // output from action.output.profile
  const isValid = true;

  action.output.forEach(output => {
    const profile = output.profile;
    if (profile) {
      const canonicalUrl = profile.reference;
      // assume the client can read the canonicalUrl
      const structureDefinition = context.client.source.read(canonicalUrl); // will probably need to deal with a Promise
      // if there's an invalid, the whole thing is invalid
      isValid = validateProfile(context.reportingBundle, structureDefinition) & isValid;
    }
  });

  if (isValid) {
    context.flags['valid'] = true;
  } else {
    context.flags['valid'] = false;
  }
}

function submitReport(context) {
  context.client.dest.submit(context.reportingBundle);
}

function deidentifyReport(context) {
  const client = context.client.trustServices;
  client.deidentify(context.contentBundle);
}

function anonymizeReport(context) {
  const client = context.client.trustServices;
  client.anonymize(context.contentBundle);
}

function pseudonymizeReport(context) {
  const client = context.client.trustServices;
  client.pseudonymize(context.contentBundle);
}

function encryptReport(context) {
  // TODO: Are we meant to actually encrypt the bundle?
  // do we need an external library to encrypt the
  // stringified bundle?
  const bundle = context.reportingBundle;
  const base64 = btoa(JSON.stringify(bundle));
  const resource = {
    resourceType: 'Binary',
    type: 'application/json',
    data: base64
  };
  context.encryptedBundle = resource;
}

function completeReporting(context) {
  context.client.db.insert('completed reports', context.reportingBundle);
}

function validateProfile(report, structureDefinition) {
  // TODO: Perhaps this is something one of the servers/clients would handle?
  return true;
}

function extractResearchData(context) {
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
      let uri = resourceType;
      if (reference) {
        uri += `?subject=${reference}`;
      }
      const resources = client.read(uri);
      const dateFilter = input.dateFilter;
      const filteredResources = [];
      // TODO: most of this filtering should be done
      // through fhirPath when the resource query
      // is made.

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
}
function executeResearchQuery(context) {
  // TODO: what's a datamart?
}
function getByPath(resource, path) {
  // TODO: function to search resources by path
  // and return correct attribute
  return resource;
}

function compareCodes(code1, code2) {
  // assume they're both coding
  return code1.code === code2.code && code1.system === code2.system;
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
  // assume the patient is only an ID
  const patientId = context.patient;
  const patient = context.client.source.read(patientId);
  context.patient = patient;
  return context;
}

function evaluateExpression(expression, resource) {
  if (expression.language === 'text/cql') {
    // we'd need a cql execution engine
    return cqlEngine.evaluate(expression.expression, resource);
  } else if (expression.language === 'text/fhirpath') {
    // we could use https://github.com/hl7/fhirpath.js/
    const path = fhirpath.compile(expression.expression);
    return path(resource);
  }
}
