const db = require('../storage/DataAccess');
const { connectToServer } = require('../utils/client');

const SERVERS = 'serverConfig';

/**
 * Fields for Servers Data Types:
 *
 * Server:
 *  @param {string} id - the id of the server
 *  @param {string} name - human readable name
 *  @param {string} endpoint: - FHIR base url
 *  @param {string} type - 'KA' | 'EHR' | 'PHA' - type of server the endpoint is
 *  @param {string} clientId - the client ID assigned to this app during registration
 *  @param {string} token - the last access token received from authorization
 *  @param {number} tokenExp - the time the token expires (UTC)
 *  @param {string} key - the last key
 *
 */

class Servers {
  addServer(server) {
    db.upsert(SERVERS, server, s => s.id === server.id);
  }

  getServer(id) {
    return db.select(SERVERS, s => s.id === id)[0];
  }

  deleteServer(id) {
    db.delete(SERVERS, s => s.id === id);
  }

  addClientId(server, clientId) {
    server.clientId = clientId;
    this.addServer(server);
  }

  getClientId(server) {
    return this.getServer(server.id).clientId;
  }

  addAccessToken(server, token) {
    server.token = token.jwt;
    server.tokenExp = token.exp;
    this.addServer(server);
  }

  async getAccessToken(server) {
    const result = this.getServer(server.id); // db.select(SERVERS, s => s.id === server.id);
    if (result.token === undefined || result.tokenExp < Date.now()) {
      // create a new token if possible
      try {
        const jwt = await connectToServer(server.endpoint);
        db.addAccessToken(server, jwt);
        return jwt;
      } catch (e) {
        console.error(e);
        return null;
      }
    } else {
      return result.token;
    }
  }

  addServerKey(server, key) {
    server.key = key;
    this.addServer(server);
  }

  getServerKey(server) {
    return this.getServer(server.id).key;
  }

  clearAccessToken(server) {
    if (!server) {
      return;
    } else {
      server.token = null;
      this.addServer(server);
    }
  }
}

module.exports = { Servers: Servers };
