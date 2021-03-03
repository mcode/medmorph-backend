const { subscriptionsFromPlanDef, subscriptionsFromBundle } = require('../fhir');

describe('Test creating Subscriptions', () => {
  const planDef = {
    resourceType: 'PlanDefinition',
    action: [
      {
        trigger: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType',
                valueCodeableConcept: {
                  coding: [
                    {
                      system:
                        'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents',
                      code: 'medication-change'
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  };

  test('It converts a bundle into subscriptions', () => {
    const bundle = {
      entry: [
        {
          resource: planDef
        },
        {
          resource: planDef
        },
        {
          resource: planDef
        },
        {
          resource: planDef
        }
      ]
    };
    const bundleSubscriptions = subscriptionsFromBundle(bundle);
    expect(bundleSubscriptions.length).toBe(4);
  });

  test('It converts medication-change correctly', () => {
    const subscriptions = subscriptionsFromPlanDef(planDef);
    expect(subscriptions.length).toBe(1);

    const subscription = subscriptions[0];
    expect(subscription.criteria).toBe('MedicationRequest?_lastUpdated=gt2021-01-01');
    expect(subscription._criteria.length).toBe(3);
    expect(subscription.channel.header[0].split('Authorization: Bearer ')[1]).toBeDefined();
  });

  test('It does not include undefined in the list when a Subscription could not be created', () => {
    const trigger = {
      extension: [
        {
          url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType',
          valueCodeableConcept: {
            coding: [
              {
                system:
                  'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents',
                code: 'mannual-notification'
              }
            ]
          }
        }
      ]
    };
    planDef.action[0].trigger.push(trigger);
    const subscriptions = subscriptionsFromPlanDef(planDef);
    expect(subscriptions.length).toBe(1);
    expect(subscriptions).not.toContain(undefined);
  });
});
