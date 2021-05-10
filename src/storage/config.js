const db = require('../storage/DataAccess');
const { CONFIG } = require('./collections');
const { configVars } = require('./configVars');

/**
 * Fields in Config:
 *
 * Server:
 *  @param {string} ADMIN_TOKEN - bearer token that grants access
 *  @param {string} AUTH - auth base url
 *  @param {string} AUTH_CERTS_URL: - auth url for certs retrieval
 *  @param {string} AUTH_TOKEN_URL - auth url for token retrieval
 *  @param {string} DATA_TRUST_SERVICE - the data trust service
 *  @param {string} REALM - specific realm for the auth server
 *
 */

function getAdminToken() {
  const selection = db.select(CONFIG, c => c.id === configVars.ADMIN_TOKEN)[0];
  if (selection) {
    return selection.value;
  }
}

function setAdminToken(value) {
  const entry = {
    id: configVars.ADMIN_TOKEN,
    value: value
  };
  db.upsert(CONFIG, entry, c => c.id === entry.id);
}

function getAuth() {
  const selection = db.select(CONFIG, c => c.id === configVars.AUTH)[0];
  if (selection) {
    return selection.value;
  }
}

function getAuthCertsUrl() {
  const selection = db.select(CONFIG, c => c.id === configVars.AUTH_CERTS_URL)[0];
  if (selection) {
    return selection.value;
  }
}

function getAuthTokenUrl() {
  const selection = db.select(CONFIG, c => c.id === configVars.AUTH_TOKEN_URL)[0];
  if (selection) {
    return selection.value;
  }
}

function getDataTrustService() {
  const selection = db.select(CONFIG, c => c.id === configVars.DATA_TRUST_SERVICE)[0];
  if (selection) {
    return selection.value;
  }
}

function getRealm() {
  const selection = db.select(CONFIG, c => c.id === configVars.REALM)[0];
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
