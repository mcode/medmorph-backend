const configVars = {
  ADMIN_TOKEN: 'admintoken',
  DATA_TRUST_SERVICE: 'datatrustservice',
  REQUIRE_AUTH: 'requireauth',
  REQUIRE_AUTH_FOR_OUTGOING: 'requireauthout',
  DYNAMIC_CLIENT_REGISTRATION: 'dynamicclientregistration'
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
    id: configVars.DYANMIC_CLIENT_REGISTRATION,
    value: false,
    display: 'Dynamic Client Registration',
    description: 'Whether the BSA will attempt to dynamically register with PHAs'
  }
];

module.exports = {
  configInit,
  configVars
};
