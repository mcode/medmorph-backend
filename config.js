const configVars = {
  ADMIN_TOKEN: 'admintoken',
  DATA_TRUST_SERVICE: 'datatrustservice',
  REQUIRE_AUTH: 'requireauth',
  REQUIRE_AUTH_FOR_OUTGOING: 'requireauthout',
  TTPS: 'trustedthirdparties'
};
const configInit = [
  {
    id: configVars.ADMIN_TOKEN,
    value: 'admin'
  },
  {
    id: configVars.DATA_TRUST_SERVICE,
    value: 'http://localhost:3005'
  },
  {
    id: configVars.REQUIRE_AUTH,
    value: 'false'
  },
  {
    id: configVars.REQUIRE_AUTH_FOR_OUTGOING,
    value: 'false'
  },
  {
    id: configVars.TTPS,
    value:
      'http://concept01.ehealthexchange.org:52774/restpassthrough/eHxHubPOCeCR/fhir/$process-message'
  }
];

module.exports = {
  configInit,
  configVars
};
