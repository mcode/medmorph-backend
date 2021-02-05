/*
 * Definition of Reporting Workflow Context:
 *
 *
 */

const IG_REGISTRY = {
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-reporting-bundle' : {} // base action definitions 
};

function initializeContext(planDefinition) {
  // TODO
  return { planDefinition };
}

function getFunction(ig, code) {
  // function here in case this needs to be more complex
  return IG_REGISTRY[ig][code];
}

function findProfile(planDefinition) {
  // figure out the profile of the target bundle

  // TODO search arrays rather than hardcode?
  const createReportAction = planDefinition.action?.find(a => a.code[0].coding[0].code === 'create-report');

  if (!createReportAction) {
    throw new Error(`PlanDefinition ${planDefinition.id} has no action with code 'create-report'`);
  }

  const bundleOutput = createReportAction.output?.find(o => o.type === 'Bundle');

  if (!bundleOutput?.profile?.[0]) {
    throw new Error(`PlanDefinition ${planDefinition.id} does not specify a profile for report bundle`);
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

  while (context.currentActionSequenceStep < context.actionSequence.length){
    const currentActionId = context.actionSequence[context.currentActionSequenceStep];
    const action = planDef.action[currentActionId];

    // TODO - check arrays for 
    // system ===  "http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions"
    const actionCode = action.code[0].coding[0].code;

    const execute = getFunction(ig, actionCode);

    // TODO: maintain context at each step for debugging?
    // context = deepCopy(context);

    execute(context);

    context.currentActionSequenceStep++;
  }
}

// function deepCopy(o) {
//   return JSON.parse(JSON.stringify(o));
// }

module.exports = {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext,
};