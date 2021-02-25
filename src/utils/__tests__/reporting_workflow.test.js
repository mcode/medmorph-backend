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

const MEDMORPH_PLANDEF_PROFILE =
  'http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-plandefinition';

const EXAMPLE_PLANDEF_1 = {
  resourceType: 'PlanDefinition',
  meta: {
    profile: [MEDMORPH_PLANDEF_PROFILE]
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
    profile: [MEDMORPH_PLANDEF_PROFILE]
  },
  action: [
    buildAction({ code: 'init-counter', next: 'check-validity' }),
    buildAction({ code: 'check-validity', next: ['inc-counter1', 'inc-counter2'] }),
    buildAction({ code: 'increment-counter', id: 'inc-counter1' }),
    buildAction({ code: 'increment-counter', id: 'inc-counter2', next: 'create-report' }),
    CREATE_REPORT_ACTION
  ]
};

/*
  This plandef has a complicated sequence of actions.

     /- B -  E -- H
    /     \
  A --- C -- F -- I
    \          /
     \- D -- G

  - I requires F and G to be completed
  - F requires B and C to be completed
  - There is no relationship between H and I
  - There is no relationship between E, F, G
  - There is no relationship between B, C, D

  So there are multiple possible valid orderings.
  (ex. [A,B,C,D,E,F,G,H,I] and [A,D,G,C,B,F,E,I,H] are both valid)
  We could assume that the algorithm will always pick the same one,
  but that may not always hold true.

*/
const EXAMPLE_PLANDEF_COMPLEX_ORDERING = {
  resourceType: 'PlanDefinition',
  meta: {
    profile: [MEDMORPH_PLANDEF_PROFILE]
  },
  action: [
    // because ABCD... was a valid sequence, shuffle up the order of actions
    // to make sure that we don't just go in pure linear order
    buildAction({ code: 'increment-counter', id: 'H' }),
    buildAction({ code: 'increment-counter', id: 'F', next: ['I'] }),
    buildAction({ code: 'increment-counter', id: 'C', next: ['F'] }),
    buildAction({ code: 'increment-counter', id: 'A', next: ['B', 'C', 'D'] }),
    buildAction({ code: 'increment-counter', id: 'B', next: ['E', 'F'] }),
    buildAction({ code: 'increment-counter', id: 'I' }),
    buildAction({ code: 'increment-counter', id: 'D', next: ['G'] }),
    buildAction({ code: 'increment-counter', id: 'G', next: ['I'] }),
    buildAction({ code: 'increment-counter', id: 'E', next: ['H'] }),

    buildAction({ code: 'init-counter', next: 'A' }),

    CREATE_REPORT_ACTION
  ]
};

describe('Test reporting workflow', () => {
  IG_REGISTRY['http://example.com/reportingBundle'] = EXAMPLE_ACTION_IMPL;

  test('It finds the bundle profile on the create-report action', () => {
    expect(findProfile(EXAMPLE_PLANDEF_1)).toEqual('http://example.com/reportingBundle');
  });

  test('It creates the expected context', () => {
    const context = initializeContext(EXAMPLE_PLANDEF_1, {}, {}, '');

    expect(context.records).toHaveLength(2);
    expect(context.patient).toBeDefined();
    expect(context.encounter).toBeDefined();
    expect(context.planDefinition).toBeDefined();
    expect(context.actionSequence).toBeDefined();
    expect(context.currentActionSequenceStep).toBe(0);
    expect(context.client.dest).toBeDefined();
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

  test('determineActionSequence produces the correct sequence given simple dependencies', () => {
    expect(determineActionSequence(EXAMPLE_PLANDEF_1)).toEqual([
      'init-counter',
      'inc-counter1',
      'inc-counter2',
      'create-report'
    ]);
  });

  test('determineActionSequence produces the correct sequence given complex dependencies', () => {
    const sequence = determineActionSequence(EXAMPLE_PLANDEF_COMPLEX_ORDERING);
    const a = sequence.indexOf('A');
    const b = sequence.indexOf('B');
    const c = sequence.indexOf('C');
    const d = sequence.indexOf('D');
    const e = sequence.indexOf('E');
    const f = sequence.indexOf('F');
    const g = sequence.indexOf('G');
    const h = sequence.indexOf('H');
    const i = sequence.indexOf('I');

    // A must be before all the others
    expect(a).toBeLessThan(b);
    expect(a).toBeLessThan(c);
    expect(a).toBeLessThan(d);
    expect(a).toBeLessThan(e);
    expect(a).toBeLessThan(f);
    expect(a).toBeLessThan(g);
    expect(a).toBeLessThan(h);
    expect(a).toBeLessThan(i);

    // B must be before E, F, H, I
    expect(b).toBeLessThan(e);
    expect(b).toBeLessThan(f);
    expect(b).toBeLessThan(h);
    expect(b).toBeLessThan(i);

    // C must be before F and I
    expect(c).toBeLessThan(f);
    expect(c).toBeLessThan(i);

    // D must be before G and I
    expect(d).toBeLessThan(g);
    expect(d).toBeLessThan(i);

    // E must be before H
    expect(e).toBeLessThan(h);

    // F must be before I
    expect(f).toBeLessThan(i);

    // G must be before I
    expect(g).toBeLessThan(i);
  });

  test('execution works with offsets between actions', done => {
    // setup a new action specifically for this test
    EXAMPLE_ACTION_IMPL['do-something-offset'] = () => done();

    const planDef = {
      resourceType: 'PlanDefinition',
      meta: {
        profile: [MEDMORPH_PLANDEF_PROFILE]
      },
      action: [
        buildAction({ code: 'init-counter', next: 'increment-counter' }),
        buildAction({ code: 'increment-counter', next: 'do-something-offset' }),
        buildAction({ code: 'do-something-offset', next: 'create-report' }),
        CREATE_REPORT_ACTION
      ]
    };

    const duration = {
      code: 'ms',
      value: 50
    };

    planDef.action[0].relatedAction[0].offsetDuration = duration;
    planDef.action[1].relatedAction[0].offsetDuration = duration;

    const context = initializeContext(planDef);
    executeWorkflow(context);
    // the workflow will run and call done() async.
    // if you don't believe me, change the action impl above to not call done()
  });
});
