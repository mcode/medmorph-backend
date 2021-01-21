const jose = require('node-jose');

const axios = require('axios');
const { v4 } = require('uuid');
const servers = require('../utils/serverConfig.json');
const clientId = 'medmorph_backend';
const keys = require('./privateKey.json');
const queryString = require('query-string');

class Client {
  /**
   *
   * @param {*} jwks This clients private key set used for signing requests
   */
  constructor(jwks) {
    this.jwks = jwks;
  }

  async connectToServer(server) {
    if (server === 'EHR') {
      this.server = servers.EHR;
    } else if (server === 'KA') {
      this.server = servers.KA;
    } else {
      console.log('ERROR - invalid server');
      return;
    }

    let props = {
      scope: 'system/*.read',
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
    };

    let headers = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        Accept: '*/*'
      }
    };

    let response = await axios.get(`${this.server}/.well-known/smart-configuration`);
    let wellKnown = response.data.token_endpoint;
    let jwt = await this.generateJWT(clientId, wellKnown, keys.kid);
    props.client_assertion = jwt;
    response = await axios.post(wellKnown, queryString.stringify(props), headers);
    let accessToken = response.data.access_token;
    headers.headers.Authorization = `Bearer ${accessToken}`;

    // This is for testing purposes only and should be removed before the merge
    if (server === 'EHR') {
      axios.get('http://pathways.mitre.org:8180/fhir/Patient/pat01', headers).then(response => {
        console.log(response.data);
      });
    } else if (server === 'KA') {
      axios.get('http://pathways.mitre.org:8190/fhir/Patient/pat01', headers).then(response => {
        console.log(response.data);
      });
    }

    return accessToken;
  }

  /**
   * Get the local keystore that contains the JWKs for this client
   */
  async getKeystore() {
    if (this.keystore) {
      return this.keystore;
    }
    if (this.jwks.keys) {
      this.keystore = await jose.JWK.asKeyStore(this.jwks);
    } else {
      this.keystore = jose.JWK.createKeyStore();
      this.keystore.add(this.jwks);
    }
    return this.keystore;
  }

  /**
   * Get the key from the keystore for the kid provided.  If it is not there return
   * the first key used for signing
   * @param {*} kid  the kid of the key to lookup
   */
  async getKeyOrDefault(kid) {
    let keystore = await this.getKeystore();
    if (kid) {
      return keystore.get(kid);
    }
    return keystore.all({ use: 'sig' });
  }

  /**
   * Generate a signed JWT used for authenticating
   * @param {*} client_id The identifier of the client on the remote server
   * @param {*} aud The token url of the server the JWT is being created for
   * @param {*} kid The identifier of the key in the JWKS to sign the JWT
   */
  async generateJWT(client_id, aud, kid = this.signingKeyId) {
    let options = { alg: 'RS384', compact: true };
    let key = await this.getKeyOrDefault(kid);

    let input = JSON.stringify({
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
}

module.exports = { Client: Client };
