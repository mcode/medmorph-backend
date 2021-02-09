/*

Definition of Reporting Workflow Context:
{
  planDefinition: the PlanDefinition for the Knowledge Artifact

  actionSequence: array of indices pointing to actions in planDefinition.action
   - assumption is that actions may be performed in any order, not necessarily 0,1,2,3...
   - action sequence should be derived based on action.relatedAction

  currentActionSequenceStep: index of which step in the actionSequence is
    currently being processed
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
  [BASE_REPORTING_BUNDLE_PROFILE]: {} // base action definitions, see MEDMORPH-35
};

function initializeContext(planDefinition) {
  // TODO -- see MEDMORPH-36
  return { planDefinition };
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

  // TODO search arrays rather than hardcode 0,0
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
  // TODO:
  // note: 6.1.8
  // The Backend Service App SHALL implement the ability
  // to process action dependencies specified via
  // the PlanDefinition.action.relatedAction elements.
  // Typical implementations will build a graph or a tree structure
  // that can be used to identify dependencies between actions.

  // simple version to just get the integers 0 -> n
  // https://stackoverflow.com/a/10050831
  return [...Array(planDefinition.action.length).keys()];
}

function executeWorkflow(context) {
  if (!context.currentActionSequenceStep) {
    context.currentActionSequenceStep = 0;
  }

  const planDef = context.planDefinition;

  if (!context.actionSequence) {
    context.actionSequence = determineActionSequence(planDef);
  }

  const ig = findProfile(planDef);

  while (context.currentActionSequenceStep < context.actionSequence.length) {
    const currentActionId = context.actionSequence[context.currentActionSequenceStep];
    const action = planDef.action[currentActionId];

    // TODO - check arrays for
    // system === "http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions"
    const actionCode = action.code[0].coding[0].code;

    const execute = getFunction(ig, actionCode);

    // TODO: maintain context at each step for debugging?
    // context = deepCopy(context);

    execute(context);

    context.currentActionSequenceStep++;
  }
}

module.exports = {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext
};
