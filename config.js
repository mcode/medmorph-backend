const configVars = {
  ADMIN_TOKEN: 'admintoken',
  DATA_TRUST_SERVICE: 'datatrustservice',
  REQUIRE_AUTH: 'requireauth',
  REQUIRE_AUTH_FOR_OUTGOING: 'requireauthout',
  DYNAMIC_CLIENT_REGISTRATION: 'dynamicclientregistration',
  CQL_WEBSERVICE_URL: 'cqlwebserviceurl'
};
const configInit = [
  {
    id: configVars.ADMIN_TOKEN,
    value: 'admin',
    display: 'Admin token',
    description:
      'Allows incoming requests to use a fixed bearer token for testing the interactions, should be unset in production.'
  },
  {
    id: configVars.DATA_TRUST_SERVICE,
    value: 'http://localhost:3005',
    display: 'Data trust service',
    description: 'Base endpoint of the data trust service'
  },
  {
    id: configVars.REQUIRE_AUTH,
    value: true,
    display: 'Require auth',
    description: 'Whether authorization is required to access endpoints on the BSA'
  },
  {
    id: configVars.REQUIRE_AUTH_FOR_OUTGOING,
    value: true,
    display: 'Require auth out',
    description: 'Whether the BSA will fetch and use a token when making external requests'
  },
  {
    id: configVars.DYNAMIC_CLIENT_REGISTRATION,
    value: false,
    display: 'Dynamic Client Registration',
    description: 'Whether the BSA will attempt to dynamically register with PHAs'
  },
  {
    id: configVars.CQL_WEBSERVICE_URL,
    value: 'http://moonshot-dev.mitre.org:8080/cql/translator?annotations=true&result-types=true',
    display: 'CQL Web Service URL',
    description: 'URL of CQL to ELM web service'
  }
];

module.exports = {
  configInit,
  configVars
};
