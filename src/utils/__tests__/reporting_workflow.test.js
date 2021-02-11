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

const buildAction = fields => {
  const action = {
    id: fields.id || fields.code,
    code: [
      {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions',
            code: fields.code
          }
        ]
      }
    ]
  };

  if (Array.isArray(fields.next)) {
    action.relatedAction = fields.next.map(id => ({
      actionId: id,
      relationship: 'before-start'
    }));
  } else if (fields.next) {
    action.relatedAction = [{ actionId: fields.next, relationship: 'before-start' }];
  }

  return action;
};

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
    buildAction({ code: 'init-counter', next: ['inc-counter1', 'inc-counter2'] }),
    buildAction({ code: 'increment-counter', id: 'inc-counter1', next: 'inc-counter2' }),
    buildAction({ code: 'increment-counter', id: 'inc-counter2', next: 'create-report' }),
    CREATE_REPORT_ACTION
  ]
};

const EXAMPLE_PLANDEF_2 = {
  resourceType: 'PlanDefinition',
  meta: {
    profile: ['http://example.com']
  },
  action: [
    buildAction({ code: 'init-counter', next: 'check-validity' }),
    buildAction({ code: 'check-validity', next: ['inc-counter1', 'inc-counter2'] }),
    buildAction({ code: 'increment-counter', id: 'inc-counter1' }),
    buildAction({ code: 'increment-counter', id: 'inc-counter2', next: 'create-report' }),
    CREATE_REPORT_ACTION
  ]
};

describe('Test creating Subscriptions', () => {
  IG_REGISTRY['http://example.com/reportingBundle'] = EXAMPLE_ACTION_IMPL;

  console.log(JSON.stringify(EXAMPLE_PLANDEF_1, null, 2));

  test('It finds the bundle profile on the create-report action', () => {
    expect(findProfile(EXAMPLE_PLANDEF_1)).toEqual('http://example.com/reportingBundle');
  });

  test('Produces the expected result 1', async () => {
    const context = initializeContext(EXAMPLE_PLANDEF_1);
    await executeWorkflow(context);

    // this planDef inits counter once and increments twice
    expect(context.counter).toEqual(2);
  });

  test('Produces the expected result 2', async () => {
    const context = initializeContext(EXAMPLE_PLANDEF_2);
    await executeWorkflow(context);

    // this planDef inits counter once then has an "exit early" before the 2 increment counters
    // so it should not == 2
    expect(context.counter).toEqual(0);
  });

  test('determineActionSequence produces the correct sequence given dependencies', () => {
    expect(determineActionSequence(EXAMPLE_PLANDEF_1)).toEqual([
      'init-counter',
      'inc-counter1',
      'inc-counter2',
      'create-report'
    ]);
  });
});
