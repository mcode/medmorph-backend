const context = {
  patient: {
    resourceType: 'Patient',
    id: 'example',
    gender: 'male',
    birthDate: '1996-12-23',
    name: [
      {
        use: 'official',
        family: 'Tables',
        given: ['Bobby', 'D', 'Tables']
      }
    ]
  },
  records: [
    {
      resourceType: 'Condition',
      id: 'example',
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }
        ]
      },
      code: {
        coding: [
          {
            system: 'http://example.com',
            code: '1234',
            display: 'Example'
          }
        ],
        text: 'This is an example'
      },
      subject: {
        reference: 'Patient/example'
      },
      onsetDateTime: '1996-12-24'
    },
    {
      resourceType: 'Condition',
      id: 'example',
      code: {
        coding: [
          {
            system: 'http://example.com',
            code: '5678',
            display: 'Example'
          }
        ],
        text: 'This is an example'
      }
    }
  ],
  encounter: {
    resourceType: 'Encounter',
    id: 'example',
    status: 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'IMP',
      display: 'inpatient encounter'
    },
    subject: {
      reference: 'Patient/example'
    }
  },
  PlanDef: {
    resourceType: 'PlanDefinition',
    id: 'plandefinition-cancer-example',
    meta: {
      versionId: '1',
      lastUpdated: '2020-11-29T02:03:28.045+00:00',
      profile: ['http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-plandefinition']
    },
    text: {
      status: 'extensions',
      div:
        '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative</b></p><p><b>Receiver Endpoint Address</b>: <a href="Endpoint-example-ph-endpoint.html">Generated Summary: id: pha-endpoint-id; status: active; <span title="{http://terminology.hl7.org/CodeSystem/endpoint-connection-type hl7-fhir-rest}">HL7 FHIR</span>; name: PHAReceiver; endpointmanager@example.pha.org; period: 2020-11-20 --&gt; (ongoing); <span title="Codes: {http://hl7.org/fhir/resource-types Bundle}">Bundle</span>; payloadMimeType: application/fhir+xml, payloadMimeType: application/fhir+json; address: http://example.pha.org/fhir</a></p><p><b>Author Signature</b>: </p><p><b style="color: maroon">Exception generating Narrative: type org.hl7.fhir.r5.model.Signature not handled - should not be here</b></p></div>'
    },
    extension: [
      {
        url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-receiverAddress',
        valueReference: {
          reference: 'Endpoint/example-ph-endpoint'
        }
      },
      {
        url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-authorSignature',
        valueSignature: {
          type: [
            {
              system: 'urn:iso-astm:E1762-95:2013',
              code: '1.2.840.10065.1.12.1.5',
              display: 'Verification Signature'
            }
          ],
          when: '2015-08-26T22:39:24.000+00:00',
          who: {
            reference: 'Organization/example-pha-org'
          },
          targetFormat: 'application/fhir+xml',
          sigFormat: 'application/signature+xml',
          data: 'Li4u'
        }
      },
      {
        url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-asyncIndicator',
        valueBoolean: true
      },
      {
        url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/ext-expectedResponseTime',
        valueDuration: {
          value: 1,
          system: 'http://unitsofmeasure.org',
          code: 'min'
        }
      }
    ],
    url: 'http://hl7.org/fhir/us/medmorph/StructureDefinition/plandefinition-cancer-example',
    version: '0.1.0',
    name: 'PlanDefinitionCancerExample',
    title: 'PlanDefinition Cancer Reporting Example',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type',
          code: 'workflow-definition',
          display: 'Workflow Definition'
        }
      ]
    },
    status: 'draft',
    experimental: true,
    date: '2020-11-04T12:32:29.858-05:00',
    publisher: 'HL7 International - Public Health Work Group',
    contact: [
      {
        telecom: [
          {
            system: 'url',
            value: 'http://hl7.org/Special/committees/pher'
          }
        ]
      }
    ],
    description: 'This is the Cancer Reporting Knowledge Artifact',
    jurisdiction: [
      {
        coding: [
          {
            system: 'urn:iso:std:iso:3166',
            code: 'US'
          }
        ]
      }
    ],
    effectivePeriod: {
      start: '2020-11-01'
    },
    relatedArtifact: [
      {
        type: 'depends-on',
        label: 'Cancer Trigger Codes',
        resource: 'http://hl7.org/fhir/us/medmorph/ValueSet/valueset-cancer-trigger-codes-example'
      }
    ],
    action: [
      {
        id: 'initiate-reporting-workflow',
        description: 'This action represents the start of a reporting workflow.',
        textEquivalent: 'Initiate Reporting Workflow',
        code: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions',
                code: 'initiate-reporting-workflow'
              }
            ]
          }
        ],
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
                      code: 'encounter-close',
                      display: 'Indicates the close of an encounter'
                    }
                  ]
                }
              }
            ],
            type: 'named-event',
            name: 'encounter-close'
          }
        ],
        input: [
          {
            type: 'Patient'
          },
          {
            type: 'Encounter'
          }
        ],
        relatedAction: [
          {
            actionId: 'check-trigger-codes',
            relationship: 'before-start',
            offsetDuration: {
              value: 1,
              system: 'http://unitsofmeasure.org',
              code: 'min'
            }
          }
        ]
      },
      {
        id: 'check-trigger-codes',
        description:
          'This action represents the execution of the checking trigger codes in the  workflow.',
        textEquivalent: 'Check Trigger Codes',
        action: [
          {
            code: [
              {
                coding: [
                  {
                    system:
                      'http://hl7.org/fhir/us/medmorph/CodeSystem/us-ph-plandefinition-actions',
                    code: 'check-trigger-codes'
                  }
                ]
              }
            ],
            condition: [
              {
                kind: 'applicability',
                expression: {
                  language: 'text/fhirpath',
                  expression:
                    'Condition.code.memberof(http://hl7.org/fhir/us/medmorph/ValueSet/valueset-cancer-trigger-codes-example)'
                }
              }
            ],
            input: [
              {
                type: 'Patient'
              },
              {
                type: 'Encounter'
              }
            ],
            relatedAction: [
              {
                actionId: 'create-report',
                relationship: 'before-start'
              }
            ]
          }
        ]
      },
      {
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
            profile: ['http://hl7.org/fhir/us/medmorph/StructureDefinition/us-ph-reporting-bundle']
          }
        ]
      }
    ]
  },
  action: {},
  client: {
    source: {
      endpoint: 'http://example-source.com',
      read: () => {
        return {
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Condition',
                id: 'example',
                code: {
                  coding: {
                    code: 'example',
                    system: 'www.example.com'
                  }
                },
                onsetDateTime: '1997-02-14T20:00:12.063Z'
              }
            },
            {
              resource: {
                resourceType: 'Condition',
                id: 'failure',
                code: {
                  coding: {
                    code: 'notExample',
                    system: 'www.example.com'
                  }
                },
                onsetDateTime: '1997-02-14T20:00:12.063Z'
              }
            },
            {
              resource: {
                resourceType: 'Condition',
                id: 'failure',
                code: {
                  coding: {
                    code: 'example',
                    system: 'www.example.com'
                  }
                },
                onsetDateTime: '1800-02-14T20:00:12.063Z'
              }
            },
            {
              resource: {
                resourceType: 'Condition',
                id: 'example',
                code: {
                  coding: {
                    code: 'example',
                    system: 'www.example.com'
                  }
                },
                onsetDateTime: '1998-04-29T20:00:12.063Z'
              }
            }
          ]
        };
      }
    },
    dest: {
      endpoint: 'http://example-destination.com',
      submit: bundle => {
        const promise = new Promise((executor, reject) => {
          if (bundle.type === 'error') {
            reject({ status: 500 });
          } else {
            executor({ status: 200 });
          }
        });
        return promise;
      }
    },
    trust: {
      deidentify: bundle => {
        const promise = new Promise(executor => {
          bundle.type = 'deidentified';
          executor({data: bundle});
        });
        return promise;
      },
      anonymize: bundle => {
        const promise = new Promise(executor => {
          bundle.type = 'anonymized';
          executor({data: bundle});
        });
        return promise;
      },
      pseudonymize: bundle => {
        const promise = new Promise(executor => {
          bundle.type = 'pseudonymized';
          executor({data: bundle});
        });
        return promise;
      }
    },
    database: {
      insert: (name, bundle) => {
        return { name: bundle };
      }
    }
  },
  reportingBundle: {},
  contentBundle: {},
  prev: null,
  next: null,
  cancelToken: null,
  flags: {},
  exitStatus: false
};

module.exports = { context };
