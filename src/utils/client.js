const jose = require('node-jose');
const axios = require('axios');
const { v4 } = require('uuid');
const queryString = require('query-string');
const keys = require('../keys/privateKey.json');
const servers = require('../storage/servers');
const configUtil = require('../storage/configUtil');
const { compareUrl } = require('../utils/url');
const error = require('../storage/logs').error('medmorph-backend:client');
const debug = require('../storage/logs').debug('medmorph-backend:client');

/**
 * Generate and return access token for the specified server. If tokenEndpoint
 * is provided it will use that, otherwise it will query the smart configuration.
 *
 * @param {string} url  the fhir base url for the server to connect to
 * @returns access token.
 */
async function connectToServer(url) {
  // Generate the client_assertion jwt
  const tokenEndpoint = await getTokenEndpoint(url);

  const { clientId, secret, customScopes } = servers.getServerByUrl(url);
  const jwt = await generateJWT(clientId, tokenEndpoint);

  const props = {
    scope: customScopes || 'system/*.*',
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwt
  };

  const headers = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      Accept: '*/*'
    }
  };

  // NOTE: client_secret_basic authorization is not part of the backend auth spec
  // (which requires the use of the signed authentication JWT)
  // but it is included here to enable connecting to the Cerner sandbox,
  // which currently only supports the client_secret_basic auth type
  if (secret) {
    delete props.client_assertion_type;
    delete props.client_assertion;

    const rawCredential = `${clientId}:${secret}`;
    const base64 = Buffer.from(rawCredential, 'binary').toString('base64');

    headers.headers['Authorization'] = `Basic ${base64}`;
  }
  // end client_secret_basic logic

  // Get access token from auth server
  return axios
    .post(tokenEndpoint, queryString.stringify(props), headers)
    .then(response => response.data)
    .catch(err => error(`Error obtaining access token from ${tokenEndpoint}\n${err.message}`));
}

/**
 * Function to get an access token for the authorization header of request
 *
 * @param {string} url - the base url of the server to connect to
 */
async function getAccessToken(url) {
  if (configUtil.getRequireAuthForOutgoing() === false) return '';

  const server = servers.getServerByUrl(url) ?? (await registerServer(url));
  if (!server?.token || server?.tokenExp < Date.now()) {
    // create a new token if possible
    try {
      const token = await connectToServer(url);
      // expires_in is time until expiration in seconds, Date.now() is in milliseconds
      const exp = Date.now() + token.expires_in * 1000;
      servers.addAccessToken(server, token.access_token, exp);
      return token.access_token;
    } catch (e) {
      servers.clearAccessToken(server);
      error(`Exception obtaining an access token from ${server.endpoint}\n${e.message}`);
      throw e;
    }
  } else if (server) {
    return server.token;
  } else {
    error(`Unable to get access token for ${url}`);
    return;
  }
}

/**
 * Register the backend app with the server and add it to the servers collection
 *
 * @param {string} url - the server base url
 * @returns the server object if successful, otherwise null
 */
async function registerServer(url) {
  if (configUtil.getDynamicClientRegistration() === 'false') return null;

  debug('Registering new server: ' + url);
  const metadata = {
    client_name: 'MITRE Medmorph Backend Service App',
    grant_types: ['client_credentials'],
    response_types: ['token'],
    token_endpoint_auth_method: 'private_key_jwt',
    application_type: 'service',
    jwks_uri: `${process.env.BASE_URL}/public/jwks`
  };

  const registrationEndpoint = await getRegistrationEndpoint(url);
  if (!registrationEndpoint) {
    error(`Unable to register new server ${url}: dynamic registration not supported`);
    return null;
  }

  return axios
    .post(registrationEndpoint, metadata)
    .then(result => {
      debug(`Registered with new server: ${url}\n Received clientId: ${result.data.client_id}`);
      const server = { name: url, endpoint: url, type: 'PHA', clientId: result.data.client_id };
      return servers.addServer(server);
    })
    .catch(err => {
      error(`Unable to register new server ${url}.\n${err.message}`);
      return null;
    });
}

/**
 * Get the token_endpoint from the .well-known/smart-configuration
 *
 * @param {string} url - the fhir base url
 * @returns token_endpoint
 */
async function getTokenEndpoint(url) {
  try {
    const response = await axios.get(`${url}/.well-known/smart-configuration`);
    return response.data.token_endpoint;
  } catch (ex) {
    try {
      // sometimes the smart-config is in a non-standard place,
      // so let's try the server capability statement
      const response = await axios.get(`${url}/metadata`);

      const rest = response.data.rest;
      const serverRest = rest.find(r => r.mode === 'server');
      const extensions = serverRest.security.extension;
      const oauth = extensions.find(e =>
        compareUrl(e.url, 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris')
      );
      return oauth.extension.find(e => e.url === 'token').valueUri;
    } catch (ex2) {
      // not sure what to do if both fail?
      error(ex);
      error(ex2);
      throw ex2;
    }
  }
}

/**
 * Get the registration_endpoint from the .well-known/smart-configuration
 *
 * @param {string} url - the fhir base url
 * @returns registration_endpoint or null if not found (not supported)
 */
async function getRegistrationEndpoint(url) {
  try {
    const response = await axios.get(`${url}/.well-known/smart-configuration`);
    return response.data.registration_endpoint;
  } catch (ex) {
    try {
      // sometimes the smart-config is in a non-standard place,
      // so let's try the server capability statement
      const response = await axios.get(`${url}/metadata`);

      const rest = response.data.rest;
      const serverRest = rest.find(r => r.mode === 'server');
      const extensions = serverRest.security.extension;
      const oauth = extensions.find(e =>
        compareUrl(e.url, 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris')
      );
      return oauth.extension.find(e => e.url === 'register').valueUri;
    } catch (ex2) {
      // not sure what to do if both fail?
      error(ex);
      error(ex2);
      return null;
    }
  }
}

/**
 * Generate a signed JWT used for authenticating
 * @param {string} client_id The identifier of the client on the remote server
 * @param {string} aud The token url of the server the JWT is being created for
 */
async function generateJWT(client_id, aud) {
  // TODO: the spec allows for either RS384 or EC384 to be used
  const options = { alg: 'RS384', compact: true };
  const keystore = await jose.JWK.asKeyStore(keys);
  const key = keystore.get(keys.keys[0].kid);

  const input = JSON.stringify({
    sub: client_id,
    iss: client_id,
    aud: aud,
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: v4()
  });

  return jose.JWS.createSign(options, key)
    .update(input)
    .final();
}

module.exports = { getAccessToken, registerServer };
