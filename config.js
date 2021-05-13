const configVars = {
    ADMIN_TOKEN: 'admintoken',
    AUTH: 'auth',
    AUTH_CERTS_URL: 'authcertsurl',
    AUTH_TOKEN_URL: 'authtokenurl',
    DATA_TRUST_SERVICE: 'datatrustservice',
    REALM: 'realm',
    REQUIRE_AUTH: 'requireauth',
    REQUIRE_AUTH_FOR_OUTGOING: 'requireauthout'
  };
  const configInit = [
    {
      id: configVars.ADMIN_TOKEN,
      value: 'admin'
    },
    {
      id: configVars.AUTH_CERTS_URL,
      value:
        'http://moonshot-dev.mitre.org:8090/auth/realms/backend_app/protocol/openid-connect/certs'
    },
    {
      id: configVars.AUTH_TOKEN_URL,
      value:
        'http://moonshot-dev.mitre.org:8090/auth/realms/backend_app/protocol/openid-connect/token'
    },
    {
      id: configVars.DATA_TRUST_SERVICE,
      value: 'http://localhost:3005'
    },
    {
      id: configVars.REQUIRE_AUTH,
      value: true
    },
    {
      id: configVars.REQUIRE_AUTH_FOR_OUTGOING,
      value: true
    }
  ];
  
  module.exports = {
    configInit,
    configVars
  };
  