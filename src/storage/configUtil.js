const db = require('./DataAccess');
const { CONFIG } = require('./collections');
const { configVars } = require('../../config');

/**
 * Fields in Config:
 *
 * Server:
 *  @param {string} ADMIN_TOKEN - bearer token that grants access
 *  @param {string} AUTH_CERTS_URL: - auth url for certs retrieval
 *  @param {string} AUTH_TOKEN_URL - auth url for token retrieval
 *  @param {string} DATA_TRUST_SERVICE - the data trust service
 *  @param {string} REQUIRE_AUTH - require auth for incoming requests
 *  @param {string} REQUIRE_AUTH_FOR_OUTGOING - require auth for outgoing requests
 *
 *
 */

function getConfig() {
  return db.select(CONFIG, () => true);
}

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

function getDataTrustService() {
  const selection = db.select(CONFIG, c => c.id === configVars.DATA_TRUST_SERVICE)[0];
  if (selection) {
    return selection.value;
  }
}

function setDataTrustService(value) {
  const entry = {
    id: configVars.DATA_TRUST_SERVICE,
    value: value
  };
  db.upsert(CONFIG, entry, c => c.id === entry.id);
}

function getRequireAuth() {
  const selection = db.select(CONFIG, c => c.id === configVars.REQUIRE_AUTH)[0];
  if (selection) {
    return selection.value;
  }
}

function setRequireAuth(value) {
  const entry = {
    id: configVars.REQUIRE_AUTH,
    value: value
  };
  db.upsert(CONFIG, entry, c => c.id === entry.id);
}

function getRequireAuthForOutgoing() {
  const selection = db.select(CONFIG, c => c.id === configVars.REQUIRE_AUTH_FOR_OUTGOING)[0];
  if (selection) {
    return selection.value;
  }
}

function setRequireAuthForOutgoing(value) {
  const entry = {
    id: configVars.REQUIRE_AUTH_FOR_OUTGOING,
    value: value
  };
  db.upsert(CONFIG, entry, c => c.id === entry.id);
}

module.exports = {
  getConfig,
  getAdminToken,
  getDataTrustService,
  getRequireAuth,
  getRequireAuthForOutgoing,
  setAdminToken,
  setDataTrustService,
  setRequireAuth,
  setRequireAuthForOutgoing
};
