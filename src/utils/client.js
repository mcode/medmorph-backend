const jose = require('node-jose');
const axios = require('axios');
const { v4 } = require('uuid');
const queryString = require('query-string');
const keys = require('../keys/privateKey.json');
const servers = require('../storage/servers');
const configUtil = require('../storage/configUtil');
const error = require('../storage/logs').error('medmorph-backend:client');
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
  const data = await axios
    .post(tokenEndpoint, queryString.stringify(props), headers)
    .then(response => response.data)
    .catch(err => error(`Error obtaining access token from ${tokenEndpoint}\n${err.message}`));
  return data;
}

/**
 * Function to get an access token for the authorization header of request
 *
 * @param {string} url - the base url of the server to connect to
 */
async function getAccessToken(url) {
  if (configUtil.getRequireAuthForOutgoing() && configUtil.getRequireAuthForOutgoing() === 'false')
    return '';

  const server = servers.getServerByUrl(url);
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
  } else {
    return server.token;
  }
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
      const oauth = extensions.find(
        e => e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
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

  return await jose.JWS.createSign(options, key)
    .update(input)
    .final();
}

module.exports = { getAccessToken };
