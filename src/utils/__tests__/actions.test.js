const { baseIgActions } = require('../actions');
const { context } = require('../__testResources__/testContext');
const actions = require('../__testResources__/testActions.json');
const axios = require('axios');

jest.mock('axios');

describe('Test the base IG actions', () => {
  const example_bundle = {
    resourceType: 'Bundle',
    type: 'message',
    entry: []
  };

  // Mock axios.post for data/trust operations
  axios.post.mockImplementation((url, bundle) => Promise.resolve({ data: bundle, status: 200 }));

  test('check-trigger-codes', () => {
    context.action = actions['check-trigger-codes-success'];
    baseIgActions['check-trigger-codes'](context);
    expect(context.flags['triggered']).toEqual(true);

    context.action = actions['check-trigger-codes-failure'];
    baseIgActions['check-trigger-codes'](context);
    expect(context.flags['triggered']).toEqual(false);
  });

  test('create-report', () => {
    context.action = actions['create-report'];
    baseIgActions['create-report'](context);
    expect(context.reportingBundle.type).toEqual('message');
    expect(context.reportingBundle.entry[0].resource.resourceType).toEqual('MessageHeader');
    expect(context.contentBundle.entry.length).toBeGreaterThan(0);
  });

  test('validate-report', () => {
    const resource_failure = {
      resourceType: 'Bundle',
      type: 'sample text'
    };
    context.action = actions['validate-report'];

    context.reportingBundle = example_bundle;
    baseIgActions['validate-report'](context);
    expect(context.flags.valid).toBe(true);
    context.reportingBundle = resource_failure;
    baseIgActions['validate-report'](context);
    expect(context.flags.valid).toBe(false);
  });

  // test('submit-report', async () => {
  //   const example_error = {
  //     resourceType: 'Bundle',
  //     type: 'error',
  //     entry: []
  //   };
  //   context.action = actions['submit-report'];

  //   context.reportingBundle = example_bundle;
  //   await baseIgActions['submit-report'](context);
  //   expect(context.flags.submitted).toBe(true);

  //   context.reportingBundle = example_error;
  //   await baseIgActions['submit-report'](context);
  //   expect(context.flags.submitted).toBe(false);
  // });

  test('deidentify-report', async () => {
    context.action = actions['deidentify-report'];
    context.reportingBundle = example_bundle;
    await baseIgActions['deidentify-report'](context);
    expect(context.flags.deidentified).toBe(true);
  });

  test('anonymize-report', async () => {
    context.action = actions['anonymize-report'];
    context.reportingBundle = example_bundle;
    await baseIgActions['anonymize-report'](context);
    expect(context.flags.anonymized).toBe(true);
  });

  test('pseudonymize-report', async () => {
    context.action = actions['pseudonymize-report'];
    context.reportingBundle = example_bundle;
    await baseIgActions['pseudonymize-report'](context);
    expect(context.flags.pseudonymized).toBe(true);
  });

  test('complete-reporting', () => {
    // how to test the database step?
    baseIgActions['complete-reporting'](context);
    expect(context.flags.completed).toBe(true);
  });

  // test('extract-research-data', async () => {
  //   context.action = actions['extract-research-data'];
  //   await baseIgActions['extract-research-data'](context);
  //   context.records.forEach(entry => {
  //     // resources without id "example"
  //     // are constructed to not match the criteria
  //     expect(entry.id).toBe('example');
  //   });
  // });
});
