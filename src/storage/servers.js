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

function addServer(server) {
  db.upsert(SERVERS, server, s => s.id === server.id);
}

function getServers() {
  return db.select(SERVERS, () => true);
}

function getServerById(id) {
  return db.select(SERVERS, s => s.id === id)[0];
}

function getServerByUrl(url) {
  return db.select(SERVERS, s => s.endpoint === url)[0];
}

function deleteServer(id) {
  db.delete(SERVERS, s => s.id === id);
}

function addClientId(server, clientId) {
  server.clientId = clientId;
  this.addServer(server);
}

function getClientId(server) {
  return this.getServerById(server.id).clientId;
}

function addAccessToken(server, token, tokenExp) {
  server.token = token;
  server.tokenExp = tokenExp;
  this.addServer(server);
}

async function getAccessToken(server) {
  const result = this.getServerById(server.id);
  if (result.token === undefined || result.tokenExp < Date.now()) {
    // create a new token if possible
    try {
      const token = await connectToServer(server.endpoint);
      // expires_in is time until expiration in seconds, Date.now() is in milliseconds
      const exp = Date.now() + token.expires_in * 100;
      db.addAccessToken(server, token.access_token, exp);
      return token;
    } catch (e) {
      console.error(e);
      return null;
    }
  } else {
    return result.token;
  }
}

function clearAccessToken(server) {
  if (!server) {
    return;
  } else {
    server.token = null;
    this.addServer(server);
  }
}

module.exports = {
  addServer,
  getServers,
  getServerById,
  getServerByUrl,
  deleteServer,
  addClientId,
  getClientId,
  addAccessToken,
  getAccessToken,
  clearAccessToken
};
