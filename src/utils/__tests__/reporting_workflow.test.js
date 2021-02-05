const {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext,
} = require('../reporting_workflow');

const EXAMPLE_ACTION_IMPL = {
  'init-counter': context => context.counter = 0,
  'increment-counter': context => context.counter++,
  'create-report': context => {}
};


const actionForCode = code => ({
  "code": [{
    "coding": [
      {
        "system": "http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions",
        "code": code
      }
    ]
  }]
});


const EXAMPLE_PLANDEF = {
  "resourceType": "PlanDefinition",
  "meta": {
    "profile": ["http://example.com"]
  },
  "action": [
    actionForCode('init-counter'),
    actionForCode('increment-counter'),
    actionForCode('increment-counter'),
    {
      "id": "create-report",
      "description": "This action represents the creation of a cancer report.",
      "textEquivalent": "Create Report",
      "code": [
        {
          "coding": [
            {
              "system": "http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions",
              "code": "create-report"
            }
          ]
        }
      ],
      "output": [
        {
          "type": "Bundle",
          "profile": [
            "http://example.com/reportingBundle"
          ]
        }
      ]
    }
  ]
}

describe('Test creating Subscriptions', () => {
  IG_REGISTRY['http://example.com/reportingBundle'] = EXAMPLE_ACTION_IMPL;

  test('It finds the bundle profile on the create-report action', () => {
    expect(findProfile(EXAMPLE_PLANDEF)).toEqual('http://example.com/reportingBundle');
  });

  test('Produces the expected result', () => {
    const context = initializeContext(EXAMPLE_PLANDEF);
    executeWorkflow(context);

    // this planDef inits counter once and increments twice
    expect(context.counter).toEqual(2);
  });

  test('determineActionSequence produces the correct sequence given dependencies', () => {
    expect(determineActionSequence(EXAMPLE_PLANDEF)).toEqual([0,1,2,3]);
  });
});
