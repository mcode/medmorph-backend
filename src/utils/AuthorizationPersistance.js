const db = require('../storage/DataAccess');

const SERVERS = 'serverConfig';
const CLIENTS = 'clientConfig';
const ACCESS = 'accessTokens';
const KEYS = 'serverKeys';

/**
 * Required Fields for AuthorizationPersistance Data Types:
 *
 * Server:
 *  @param {string} id - the id of the server
 *
 * Config:
 *  @param {string} jwks_url - the url for the jwks
 *
 * Client:
 *  @param {string} id - the id of the client
 *  @param {string} serverId - the id of server (added when client config is saved)
 *
 * Token:
 *  @param {string} jwt - the jwt
 *  @param {number} exp - the time the token expires (UTC)
 *  @param {string} serverId - the id of server (added when token is saved)
 *
 *  Key:
 *  @param {string} serverId - the id of server (added when key is saved)
 *
 */

class AuthorizationPersistance {
  addServer(server) {
    db.insert(SERVERS, server);
  }

  addServerConfiguration(server, config) {
    db.upsert(SERVERS, config, s => s.id === server.id);
  }

  getServerConfiguration(server) {
    return db.select(SERVERS, s => s.id === server.id);
  }

  addClientConfiguration(server, client) {
    client.serverId = server.id;
    db.upsert(CLIENTS, client, s => s.id === server.id);
  }

  getClientConfiguration(server) {
    return db.select(CLIENTS, s => s.serverId === server.id);
  }

  addAccessToken(server, token) {
    token.serverId = server.id;
    db.upsert(ACCESS, token, s => s.id === server.id);
  }

  getAccessToken(server) {
    const t = db.select(ACCESS, s => s.serverId === server.id);
    if (t[0] === undefined || t[0].exp < Date.now()) {
      return null;
    } else {
      return t[0];
    }
  }

  addServerKeys(server, keys) {
    keys.serverId = server.id;
    db.upsert(KEYS, keys, s => s.id === server.id);
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

module.exports = { AuthorizationPersistance: AuthorizationPersistance };
