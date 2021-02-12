const { v4: uuidv4 } = require('uuid');
const graphlib = require('graphlib');
const db = require('../storage/DataAccess');
const { default: axios } = require('axios');
const { connectToServer } = require('./client');
const { getReferencedResource } = require('../utils/fhir');

const COLLECTION = 'reporting';

/*

Definition of Reporting Workflow Context:
{
  id: unique identifier for the context object

  planDefinition: the PlanDefinition for the Knowledge Artifact

  actionSequence: array of action ids pointing to actions in planDefinition.action
   - assumption is that actions may be performed in any order, not necessarily 0,1,2,3...
   - action sequence should be derived based on action.relatedAction

  currentActionSequenceStep: index of which step in the actionSequence is
    currently being processed

  cancelToken: indicates the job should be cancelled
    (from a process external to the job itself -- this tells the job to cease processing)

  exitStatus: if set, terminates the job and marks it with the given status
    (for example, if a given patient doesn't meet reporting criteria, don't keep reporting)
}

Try to keep the wiki page up to date with this implementation!
https://github.com/mcode/medmorph-backend/wiki/Reporting-Workflow
*/

const BASE_REPORTING_BUNDLE_PROFILE =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-reporting-bundle';
const RECEIVER_ADDRESS_EXT =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-receiverAddress';

/**
 * IG_REGISTRY maps the profile for a reporting bundle under an IG
 * to the actions defined for action codes within that IG.
 * Each content IG should have one JS file defined, which, when require()d,
 * will register itself into this IG.
 * Note that the base actions should be extend-able, so that content IGs
 * do not have to re-implement codes unnecessarily.
 */
const IG_REGISTRY = {
  [BASE_REPORTING_BUNDLE_PROFILE]: {} // base action definitions, see MEDMORPH-35
};

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
  return axios
    .get(`${url}/${uri}`, { headers: headers })
    .then(response => response.data)
    .catch(err => console.error(err));
}

/**
 * Post the reporting bundle to the endpoint designated in the PlanDefinition
 *
 * @param {PlanDefinition} planDefinition - the current PlanDefinition from the context
 * @param {Bundle} bundle - the reporting Bundle to submit
 * @returns axios promise with data
 */
async function submitBundle(planDefinition, bundle) {
  const receiverAddress = planDefinition.extension.find(e => e.url === RECEIVER_ADDRESS_EXT);
  const endpointRef = receiverAddress.valueReference.reference;
  const endpointId = endpointRef.split('/')[1];
  const endpoint = db.select('endpoints', e => e.id === endpointId);
  const url = endpoint.address;
  // Not sure how this will work since the url comes from endpoint.address....
  const token = await connectToServer(url);
  const headers = { Authorization: `Bearer ${token}` };
  return axios
    .post(url, bundle, { headers: headers })
    .then(response => response.data)
    .catch(err => console.error(err));
}

/**
 * Helper function to call specific operations on the data trust service server.
 *
 * @param {string} operation = 'deidentify' | 'anonymize' | 'pseudonymize'
 * @param {Bundle} bundle - the bundle to perform operation on
 * @returns axios promise with data
 */
function dataTrustOperation(operation, bundle) {
  return axios
    .post(`${process.env.DATA_TRUST_SERVICE}/Bundle/$${operation}`, bundle)
    .then(response => response.data)
    .catch(err => console.error(err));
}

/**
 * Function to use the PlanDefinition and triggering resource to create a report
 *
 * @param {PlanDefinition} planDef - the PlanDefinition resource
 * @param {*} resource - the resource which triggered the notification
 */
async function initializeReportingWorkflow(planDef, resource = null) {
  // TODO: MEDMORPH-49 to make sure the resource is always included
  if (!resource) return;

  let patient = null;
  if (resource.patient) patient = await getReferencedResource(resource.patient.reference);
  else if (resource.subject) patient = await getReferencedResource(resource.subject.reference);
  else if (resource.resourceType === 'Patient') patient = resource;

  let encounter = null;
  if (resource.encounter) encounter = await getReferencedResource(resource.encounter.reference);
  else if (resource.context) encounter = await getReferencedResource(resource.context.reference);
  else if (resource.resourceType === 'Encounter') encounter = resource;

  // QUESTION: Should encounter and patient be saved to the database?

  const context = initializeContext(planDef, patient, encounter);
  executeWorkflow(context);
}

/**
 * Create the initial workflow context
 *
 * @param {PlanDefinition} planDefinition - the PlanDefinition resource for this workflow
 * @param {Patient} patient - the patient resource from the triggering resource, null if not found
 * @param {Encounter} encounter - the encounter resource from the trigger resource,
 *    null if not found
 * @returns the initialized context object
 */
function initializeContext(planDefinition, patient, encounter) {
  const records = [];
  if (patient) records.push(patient);
  if (encounter) records.push(encounter);
  const actionSequence = determineActionSequence(planDefinition);
  const initialAction = planDefinition.action.find(a => a.id === actionSequence[0]);

  return {
    id: uuidv4(),
    patient: patient,
    records: records,
    encounter: encounter,
    planDefinition,
    action: initialAction,
    messageHeader: null, // Note: not used in actions
    client: {
      source: {
        read: readFromEHR
      },
      dest: {
        submit: async bundle => submitBundle(planDefinition, bundle)
      },
      trustServices: {
        deidentify: bundle => dataTrustOperation('deidentify', bundle),
        anonymize: bundle => dataTrustOperation('anonymize', bundle),
        pseudonymize: bundle => dataTrustOperation('pseudonymize', bundle)
      },
      db
    },
    reportingBundle: null,
    contentBundle: null,
    next: null, // Note: not used in actions
    prev: null, // Note: not used in actions
    flags: {},
    currentActionSequenceStep: 0,
    actionSequence,
    cancelToken: false
  };
}

function getFunction(ig, code) {
  // use a function here in case this needs to be more complex
  return IG_REGISTRY[ig][code];
}

/**
 * Find the target profile to be used when generating a bundle
 * in support of the given PlanDefinition.
 * The profile should be on the 'output' field of the 'create-report' action.
 */
function findProfile(planDefinition) {
  // figure out the profile of the target bundle

  const createReportAction = planDefinition.action?.find(
    a => a.code[0].coding[0].code === 'create-report'
  );

  if (!createReportAction) {
    throw new Error(`PlanDefinition ${planDefinition.id} has no action with code 'create-report'`);
  }

  const bundleOutput = createReportAction.output?.find(o => o.type === 'Bundle');

  if (!bundleOutput?.profile?.[0]) {
    throw new Error(
      `PlanDefinition ${planDefinition.id} does not specify a profile for report bundle`
    );
    // option B is just use the default profile
  }

  return bundleOutput.profile[0];
}

function determineActionSequence(planDefinition) {
  // 6.1.8
  // The Backend Service App SHALL implement the ability
  // to process action dependencies specified via
  // the PlanDefinition.action.relatedAction elements.
  // Typical implementations will build a graph or a tree structure
  // that can be used to identify dependencies between actions.

  // 6.1.3
  // For executing actions which are delayed by a time duration,
  //   Knowledge Artifact producers SHALL specify the duration
  //   in the PlanDefinition.action.timing element.

  // For executing actions which are dependent on other actions,
  //   Knowledge Artifact producers SHALL specify the related action
  //   in the PlanDefinition.action.relatedAction element.

  // The PlanDefinition.action.relatedAction.relationship to be used
  //   for MedMorph related actions SHALL be before-start.
  //   This implies that the related action cannot start
  //   until the parent action is executed.

  // To specify related actions which are delayed by a time duration,
  //   the PlanDefinition.action.relatedAction.offsetDuration element SHALL be used.

  // we use graphlib: https://github.com/dagrejs/graphlib/wiki/API-Reference
  // to build a dependency graph, then do a preorder traversal to turn it into a list

  // note this is a lot of complexity, and is really only ever necessary if there are
  // actions with more than one relatedAction.

  // TODO: what if there are 2 relatedActions with different offsets?

  const g = new graphlib.Graph();

  for (const action of planDefinition.action) {
    g.setNode(action.id);

    if (action.relatedAction) {
      for (const relatedAction of action.relatedAction) {
        // spec requires relationship SHALL === 'before-start'
        // so relatedAction is after currentAction

        // directed edge from arg1 --> arg2
        // TODO: track the offset on the edge label maybe?
        g.setEdge(action.id, relatedAction.actionId);
        // note that relatedAction.id doesn't already have to be in the graph
        // it will be added if not
      }
    }
  }

  // An implementation of topological sorting.
  // Given a Graph g this function returns an array of nodes
  // such that for each edge u -> v, u appears before v in the array.
  // https://github.com/dagrejs/graphlib/wiki/API-Reference#alg-topsort
  // note the graph must not have cycles
  const path = graphlib.alg.topsort(g);
  return path;
}

async function executeWorkflow(context) {
  db.upsert(COLLECTION, context, c => c.id === context.id);

  const planDef = context.planDefinition;
  const ig = findProfile(planDef);

  while (context.currentActionSequenceStep < context.actionSequence.length) {
    const actionCode = context.action.code[0].coding[0].code;

    const execute = getFunction(ig, actionCode);

    // TODO: maintain context at each step for debugging?
    // context = deepCopy(context);

    // check the DB to get cancelToken
    // TODO: is there a better way to do this?
    const cancelToken = db.select(COLLECTION, c => c.id === context.id).cancelToken;
    if (cancelToken) return;

    await execute(context);

    // update the db after every completed step
    db.update(
      COLLECTION,
      c => c.id === context.id,
      c => Object.assign(c, context)
    );

    if (context.exitStatus) break;

    context.currentActionSequenceStep++;
    const currentActionId = context.actionSequence[context.currentActionSequenceStep];
    const action = planDef.action.find(a => a.id === currentActionId);
    context.action = action;
  }
}

module.exports = {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext,
  initializeReportingWorkflow
};
