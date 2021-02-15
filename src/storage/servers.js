const db = require('../storage/DataAccess');
const { connectToServer } = require('../utils/client');

const SERVERS = 'serverConfig';
const CLIENTS = 'clientConfig';
const ACCESS = 'accessTokens';
const KEYS = 'serverKeys';

/**
 * Required Fields for Servers Data Types:
 *
 * Server:
 *  @param {string} id - the id of the server
 *  @param {string} name - human readable name
 *  @param {string} endpoint: - FHIR base url
 *  @param {string} type - 'KA' | 'EHR' | 'PHA' - type of server the endpoint is
 *
 * Client:
 *  @param {string} id - the id of the client
 *  @param {string} serverId - the id of server (added when client config is saved)
 *
 * Token:
 *  @param {string} token - the access token
 *  @param {number} exp - the time the token expires (UTC)
 *  @param {string} serverId - the id of server (added when token is saved)
 *
 *  Key:
 *  @param {string} serverId - the id of server (added when key is saved)
 *
 */

class Servers {
  addServer(server) {
    db.upsert(SERVERS, { ...server }, s => s.id === server.id);
  }

  getServer(id) {
    return db.select(SERVERS, s => s.id === id);
  }

  deleteServer(id) {
    // delete any keys with server id
    db.delete(KEYS, s => s.serverId === id);

    // delete any tokens with server id
    db.delete(ACCESS, s => s.serverId === id);

    // delete any clients with server id
    db.delete(CLIENTS, s => s.serverId === id);

    // delete any servers with server id
    db.delete(SERVERS, s => s.id === id);
  }

  addClientConfiguration(server, client) {
    client.serverId = server.id;
    db.upsert(CLIENTS, { ...client }, s => s.id === server.id);
  }

  getClientConfiguration(server) {
    return db.select(CLIENTS, s => s.serverId === server.id);
  }

  addAccessToken(server, token) {
    token.serverId = server.id;
    db.upsert(ACCESS, { ...token }, s => s.id === server.id);
  }

  async getAccessToken(server) {
    const t = db.select(ACCESS, s => s.serverId === server.id);
    if (t[0] === undefined || t[0].exp < Date.now()) {
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
      return t[0];
    }
  }

  addServerKeys(server, keys) {
    keys.serverId = server.id;
    db.upsert(KEYS, { ...keys }, s => s.id === server.id);
  }

  getServerKeys(server) {
    let keys = db.select(KEYS, s => s.serverId === server.id);
    if (!keys && this.getServerConfiguration(server)) {
      keys = this.getServerConfiguration(server).jwks;
    }
    return keys;
  }

  clearTokens(server) {
    if (!server) {
      return;
    } else {
      db.delete(ACCESS, s => s.serverId === server.id);
    }
  }
}

module.exports = { Servers: Servers };
