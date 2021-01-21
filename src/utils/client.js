const jose = require('node-jose');
//const InMemoryPersistence = require('./in_memory_persistence');

const axios = require('axios');
const { v4 } = require('uuid');

class Client {
  /**
   *
   * @param {*} jwks This clients private key set used for signing requests
   */
  constructor(jwks) {
    this.jwks = jwks;
    // this.persistence = persistence;
    // this.serverKeyStores = {};
    // this.signingKeyId = options.signingKeyId;
    // this.options = options;
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
      console.log(this.keystore);
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

  /**
   * Get a cached access token for the remote server
   * @param {*} server The base url of the server
   */
  async getAccessToken(server) {
    return await this.persistence.getAccessToken(server);
  }

  async requestToken(server, force = false) {
    // check to see if we have a valid access token for the server
    let accessToken = await this.getAccessToken(server);
    return accessToken ? accessToken : await this.requestAccessToken(server);
  }

  /**
   * Request an access token from a remote server
   * @param {*} server The base url of the server to request a token from
   * @param {*} kid the identifier of the key to use for signing the token request
   * @param {*} scopes the scopes to request access for
   */
  async requestAccessToken(server, kid = this.signingKeyId, scopes = this.scopes()) {
    // see if there is an access token that is still good and send that back if so
    let accessToken = await this.getAccessToken(server);
    if (accessToken && accessToken.issued_at + accessToken.expires_in > Date.now() / 1000) {
      return accessToken;
    }
    let serverConfig = this.persistence.getServerConfiguration(server);
    let client = this.persistence.getClientConfiguration(server);

    //If the client configuration does not exist try to self register the client
    if (!client && serverConfig.registration_endpoint) {
      client = await this.register(server);
    }
    // if the client configuration exists try to get an access token
    if (client) {
      let jwt = await this.generateJWT(client.client_id, serverConfig.token_endpoint, kid);
      let params = {
        client_assertion: jwt,
        client_assertion_type: '',
        grant_type: 'client_credentials',
        scopes: scopes
      };
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      let response = await axios.post(serverConfig.token_endpoint, qs.stringify(params), config);
      let token = response.data;
      token.issued_at = Date.now() / 1000;
      await this.addAccessToken(server, token);
      return token;
    } else {
      throw 'Client information not found';
    }
  }
}

module.exports = { Client: Client };
