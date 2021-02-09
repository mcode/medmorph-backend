const {
  determineActionSequence,
  executeWorkflow,
  findProfile,
  IG_REGISTRY,
  initializeContext
} = require('../reporting_workflow');

const EXAMPLE_ACTION_IMPL = {
  'init-counter': context => (context.counter = 0),
  'increment-counter': context => context.counter++,
  'check-validity': context => (context.exitStatus = 404),
  'create-report': () => {}
};

const actionForCode = code => ({
  code: [
    {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions',
          code: code
        }
      ]
    }
  ]
});

const CREATE_REPORT_ACTION = {
  id: 'create-report',
  description: 'This action represents the creation of a cancer report.',
  textEquivalent: 'Create Report',
  code: [
    {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions',
          code: 'create-report'
        }
      ]
    }
  ],
  output: [
    {
      type: 'Bundle',
      profile: ['http://example.com/reportingBundle']
    }
  ]
};

const EXAMPLE_PLANDEF_1 = {
  resourceType: 'PlanDefinition',
  meta: {
    profile: ['http://example.com']
  },
  action: [
    actionForCode('init-counter'),
    actionForCode('increment-counter'),
    actionForCode('increment-counter'),
    CREATE_REPORT_ACTION
  ]
};

const EXAMPLE_PLANDEF_2 = {
  resourceType: 'PlanDefinition',
  meta: {
    profile: ['http://example.com']
  },
  action: [
    actionForCode('init-counter'),
    actionForCode('check-validity'),
    actionForCode('increment-counter'),
    actionForCode('increment-counter'),
    CREATE_REPORT_ACTION
  ]
};

describe('Test creating Subscriptions', () => {
  IG_REGISTRY['http://example.com/reportingBundle'] = EXAMPLE_ACTION_IMPL;

  test('It finds the bundle profile on the create-report action', () => {
    expect(findProfile(EXAMPLE_PLANDEF_1)).toEqual('http://example.com/reportingBundle');
  });

  test('Produces the expected result 1', () => {
    const context = initializeContext(EXAMPLE_PLANDEF_1);
    executeWorkflow(context);

    // this planDef inits counter once and increments twice
    expect(context.counter).toEqual(2);
  });

  test('Produces the expected result 2', () => {
    const context = initializeContext(EXAMPLE_PLANDEF_2);
    executeWorkflow(context);

    // this planDef inits counter once then has an "exit early" before the 2 increment counters
    // so it should not == 2
    expect(context.counter).toEqual(0);
  });

  test('determineActionSequence produces the correct sequence given dependencies', () => {
    expect(determineActionSequence(EXAMPLE_PLANDEF_1)).toEqual([0, 1, 2, 3]);
  });
});
