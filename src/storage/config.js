const db = require('../storage/DataAccess');
const { CONFIG } = require('./collections');

/**
 * Fields in Config:
 *
 * Server:
 *  @param {string} ADMIN_TOKEN - the id of the server
 *  @param {string} AUTH - human readable name
 *  @param {string} AUTH_CERTS_URL: - FHIR base url
 *  @param {string} AUTH_TOKEN_URL - 'KA' | 'EHR' | 'PHA' - type of server the endpoint is
 *  @param {string} DATA_TRUST_SERVICE - the client ID assigned to this app during registration
 *  @param {string} REALM - the last access token received from authorization
 *
 */

function getAdminToken() {
  const selection = db.select(CONFIG, c => c.key === 'ADMIN_TOKEN')[0];
  if (selection) {
    return selection.value;
  }
}

function setAdminToken(value) {
  const entry = {
    key: 'ADMIN_TOKEN',
    value: value
  };
  db.upsert(CONFIG, entry, c => c.key === entry.key);
}

function getAuth() {
  const selection = db.select(CONFIG, c => c.key === 'AUTH')[0];
  if (selection) {
    return selection.value;
  }
}

function getAuthCertsUrl() {
  const selection = db.select(CONFIG, c => c.key === 'AUTH_CERTS_URL')[0];
  if (selection) {
    return selection.value;
  }
}

function getAuthTokenUrl() {
  const selection = db.select(CONFIG, c => c.key === 'AUTH_TOKEN_URL')[0];
  if (selection) {
    return selection.value;
  }
}

function getDataTrustService() {
  const selection = db.select(CONFIG, c => c.key === 'DATA_TRUST_SERVICE')[0];
  if (selection) {
    return selection.value;
  }
}

function getRealm() {
  const selection = db.select(CONFIG, c => c.key === 'REALM')[0];
  if (selection) {
    return selection.value;
  }
}

module.exports = {
  getAdminToken,
  getAuth,
  getAuthCertsUrl,
  getAuthTokenUrl,
  getDataTrustService,
  getRealm,
  setAdminToken
};
