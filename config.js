const configVars = {
  ADMIN_TOKEN: 'admintoken',
  DATA_TRUST_SERVICE: 'datatrustservice',
  REQUIRE_AUTH: 'requireauth',
  REQUIRE_AUTH_FOR_OUTGOING: 'requireauthout'
};
const configInit = [
  {
    id: configVars.ADMIN_TOKEN,
    value: 'admin',
    display: 'Admin token'
  },
  {
    id: configVars.DATA_TRUST_SERVICE,
    value: 'http://localhost:3005',
    display: 'Data trust service'
  },
  {
    id: configVars.REQUIRE_AUTH,
    value: 'true',
    display: 'Require auth'
  },
  {
    id: configVars.REQUIRE_AUTH_FOR_OUTGOING,
    value: 'true',
    display: 'Require auth out'
  }
];

module.exports = {
  configInit,
  configVars
};
