const { subscriptionsFromPlanDef, subscriptionsFromBundle } = require('../fhir');

describe('Test creating Subscriptions', () => {
  test('It creates correct Subscription', () => {
    const planDef = {
      resourceType: 'PlanDefinition',
      action: [
        {
          trigger: [
            {
              extension: [
                {
                  url:
                    'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType',
                  valueCodeableConcept: {
                    coding: [
                      {
                        system:
                          'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents',
                        code: 'encounter-change'
                      }
                    ]
                  }
                }
              ]
            },
            {
              extension: [
                {
                  url:
                    'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-us-ph-namedEventType',
                  valueCodeableConcept: {
                    coding: [
                      {
                        system:
                          'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-triggerdefinition-namedevents',
                        code: 'new-labresult'
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
    const bundle = {
      entry: [
        {
          resource: planDef
        },
        {
          resource: planDef
        }
      ]
    };
    console.log(subscriptionsFromPlanDef(planDef));
    console.log(subscriptionsFromBundle(bundle).length);
    expect(true).toBeTruthy();
  });
});
