const jose = require('node-jose');
const axios = require('axios');
const { v4 } = require('uuid');
const clientId = 'medmorph_backend';
const keys = require('../keys/privateKey.json');

class Client {
  /**
   *
   * @param {*} jwks This clients private key set used for signing requests
   */
  constructor(jwks) {
    this.jwks = jwks;
  }

  /**
   * Generate and return access token for the specified server
   * @param {string} url  the fhir base url for the server to connect to
   */
  async connectToServer(url) {
    const response = await axios.get(`${url}/.well-known/smart-configuration`);
    const wellKnown = response.data.token_endpoint;
    const jwt = await this.generateJWT(clientId, wellKnown, keys.kid);

    return jwt;
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
   * @param {string} kid - the kid of the key to lookup
   */
  async getKeyOrDefault(kid) {
    const keystore = await this.getKeystore();
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
    // TODO: the spec allows for either RS384 or EC384 to be used
    const options = { alg: 'RS384', compact: true };
    const key = await this.getKeyOrDefault(kid);

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
}

module.exports = { Client: Client };
