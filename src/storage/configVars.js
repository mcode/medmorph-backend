const configVars = {
  ADMIN_TOKEN: 'admintoken',
  AUTH: 'auth',
  AUTH_CERTS_URL: 'authcertsurl',
  AUTH_TOKEN_URL: 'authtokenurl',
  DATA_TRUST_SERVICE: 'datatrustservice',
  REALM: 'realm'
};
const configInit = [
  {
    key: configVars.ADMIN_TOKEN,
    value: 'admin'
  },
  {
    key: configVars.AUTH,
    value: 'http://moonshot-dev.mitre.org:8090/auth'
  },
  {
    key: configVars.AUTH_CERTS_URL,
    value:
      'http://moonshot-dev.mitre.org:8090/auth/realms/backend_app/protocol/openid-connect/certs'
  },
  {
    key: configVars.AUTH_TOKEN_URL,
    value:
      'http://moonshot-dev.mitre.org:8090/auth/realms/backend_app/protocol/openid-connect/token'
  },
  {
    key: configVars.DATA_TRUST_SERVICE,
    value: 'http://localhost:3005'
  },
  {
    key: configVars.REALM,
    value: 'backend_app'
  }
];

module.exports = {
  configInit,
  configVars
};
