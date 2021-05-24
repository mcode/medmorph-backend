const db = require('./DataAccess');
const { LOGS, ERRORS, REQUESTS, NOTIFICATIONS } = require('./collections');
const debugConsole = require('debug');
const { v4: uuidv4 } = require('uuid');
const normalizeUrl = require('normalize-url');

function debug(location) {
  return message => {
    const logger = debugConsole(location);
    logger(message);
    const log = {
      id: uuidv4(),
      timestamp: Date.now(),
      message: message,
      location: location
    };
    db.insert(LOGS, log);
  };
}

function error(location) {
  return (errorMessage, notif) => {
    const logger = debugConsole(location);
    logger(errorMessage);
    const log = {
      id: uuidv4(),
      timestamp: Date.now(),
      error: errorMessage,
      location: location
    };
    db.insert(ERRORS, log);

    const notification = {
      id: uuidv4(),
      timestamp: Date.now(),
      notif: notif || error,
      viewed: false,
      type: 'error'
    };
    db.insert(NOTIFICATIONS, notification);
  };
}

function storeRequest(request) {
  const modifiedBody = Object.assign({}, request.body);
  if (modifiedBody.password) {
    delete modifiedBody.password;
  }
  let url = '';
  try {
    // some request urls can't be normalized and
    // throw an error
    url = normalizeUrl(request.url);
  } catch {
    url = request.url;
  }
  const log = {
    id: uuidv4(),
    timestamp: Date.now(),
    url: url,
    body: modifiedBody,
    headers: request.headers
  };
  db.insert(REQUESTS, log);
}

module.exports = { debug, error, storeRequest };
