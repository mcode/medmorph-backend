const { v4: uuidv4 } = require('uuid');
const graphlib = require('graphlib');
const db = require('../storage/DataAccess');
const { getReferencedResource, getEndpointId } = require('../utils/fhir');
const { getEHRServer } = require('../storage/servers');
const { baseIgActions } = require('./actions');
const { REPORTING, ENDPOINTS } = require('../storage/collections');
const debug = require('debug')('medmorph-backend:server');

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

/**
 * IG_REGISTRY maps the profile for a reporting bundle under an IG
 * to the actions defined for action codes within that IG.
 * Each content IG should have one JS file defined, which, when require()d,
 * will register itself into this IG.
 * Note that the base actions should be extend-able, so that content IGs
 * do not have to re-implement codes unnecessarily.
 */
const IG_REGISTRY = {
  [BASE_REPORTING_BUNDLE_PROFILE]: baseIgActions
};

/**
 * Function to use the PlanDefinition and triggering resource to create a report. This
 * initializes the context and begins the executeWorkflow
 *
 * @param {PlanDefinition} planDef - the PlanDefinition resource
 * @param {*} resource - the resource which triggered the notification
 */
async function startReportingWorkflow(planDef, resource = null) {
  // TODO: MEDMORPH-49 to make sure the resource is always included
  if (!resource) return;

  const ehrUrl = getEHRServer().endpoint;
  let patient = null;
  if (resource.patient) patient = await getReferencedResource(ehrUrl, resource.patient.reference);
  else if (resource.subject)
    patient = await getReferencedResource(ehrUrl, resource.subject.reference);
  else if (resource.resourceType === 'Patient') patient = resource;

  let encounter = null;
  if (resource.encounter)
    encounter = await getReferencedResource(ehrUrl, resource.encounter.reference);
  else if (resource.context)
    encounter = await getReferencedResource(ehrUrl, resource.context.reference);
  else if (resource.resourceType === 'Encounter') encounter = resource;

  // Get the endpoint to submit the report to from the PlanDefinition
  const endpointId = getEndpointId(planDef);
  const endpoint = db.select(ENDPOINTS, e => e.id === endpointId);
  const destEndpoint = endpoint[0].address;

  // QUESTION: Should encounter and patient be saved to the database?

  const context = initializeContext(planDef, patient, encounter, destEndpoint);
  executeWorkflow(context);
}

/**
 * Create the initial workflow context
 *
 * @param {PlanDefinition} planDefinition - the PlanDefinition resource for this workflow
 * @param {Patient} patient - the patient resource from the triggering resource, null if not found
 * @param {Encounter} encounter - the encounter resource from the trigger resource,
 *    null if not found
 * @param {string} destEndpoint - the destination endpoint to submit the report to
 * @returns the initialized context object
 */
function initializeContext(planDefinition, patient, encounter, destEndpoint) {
  const records = [];
  if (patient) records.push(patient);
  if (encounter) records.push(encounter);
  const actionSequence = determineActionSequence(planDefinition);

  return {
    id: uuidv4(),
    patient: patient,
    records: records,
    encounter: encounter,
    planDefinition,
    client: {
      dest: destEndpoint
    },
    reportingBundle: null,
    contentBundle: null,
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
    a => a.code?.[0].coding[0].code === 'create-report'
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

        if (relatedAction.offsetDuration) {
          // assume that the offsetDuration indicates a minimum, not a maximum.
          // Duration object has a 'comparator' field which can be </<=/>/>=
          // TODO: if there's a case of offset < x, just ignore it and run immediately
          const { value, code } = relatedAction.offsetDuration;
          const offsetTimeInMs = convertTimeToMs(value, code);

          // FHIR IDs must be [A-Za-z0-9\-\.]{1,64}
          // so our fake ID here just has to include something else
          // format is "&&(time) (from) (to)" to ensure it's unique
          const fakeId = `&&${offsetTimeInMs} ${action.id} ${relatedAction.actionId}`;

          // instead of a -> b
          // add a -> offset -> b
          g.setEdge(action.id, fakeId);
          g.setEdge(fakeId, relatedAction.actionId);
        } else {
          // directed edge from arg1 --> arg2
          g.setEdge(action.id, relatedAction.actionId);
          // note that relatedAction.id doesn't already have to be in the graph
          // it will be added if not
        }
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

function convertTimeToMs(value, unit) {
  // assumption: we will never have to deal with units larger than weeks
  // because those get complicated (ex, how many ms is a month?)

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'min':
      return value * 1000 * 60;
    case 'h':
      return value * 1000 * 60 * 60;
    case 'd':
      return value * 1000 * 60 * 60 * 24;
    case 'wk':
      return value * 1000 * 60 * 60 * 24 * 7;
    default:
      throw new Error(`unsupported unit ${unit}`);
  }
}

async function executeWorkflow(context) {
  db.upsert(REPORTING, context, c => c.id === context.id);

  const planDef = context.planDefinition;
  const ig = findProfile(planDef);

  while (context.currentActionSequenceStep < context.actionSequence.length) {
    const currentActionId = context.actionSequence[context.currentActionSequenceStep];

    if (currentActionId.startsWith('&&')) {
      // delay the specified amount of time
      const waitTime = Number(currentActionId.substring(2).split(' ')[0]); // split off the first && and pick out the time
      context.currentActionSequenceStep++;

      // TODO: do we even need a job scheduler?
      debug(`Waiting ${waitTime}ms until next action`);
      setTimeout(() => executeWorkflow(context), waitTime);
      break;
    }

    const action = planDef.action.find(a => a.id === currentActionId);
    context.action = action;

    const actionCode = context.action.code[0].coding[0].code;
    debug(`Executing ${actionCode} for PlanDefinition/${planDef.id}`);

    const execute = getFunction(ig, actionCode);
    // TODO: maintain context at each step for debugging?
    // context = deepCopy(context);

    // check the DB to get cancelToken
    // TODO: is there a better way to do this?
    const cancelToken = db.select(REPORTING, c => c.id === context.id).cancelToken;
    if (cancelToken) return;

    if (execute) await execute(context);
    else debug(`No function exists for code ${actionCode} (PlanDefinition/${planDef.id})`);

    // update the db after every completed step
    db.update(
      REPORTING,
      c => c.id === context.id,
      c => Object.assign(c, context)
    );

    if (context.exitStatus) break;

    context.currentActionSequenceStep++;
  }
}

module.exports = {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext,
  startReportingWorkflow
};
