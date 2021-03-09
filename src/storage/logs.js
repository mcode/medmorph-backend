const db = require('./DataAccess');
const { LOGS, ERRORS, REQUESTS } = require('./collections');
const debugConsole = require('debug');
const { v4: uuidv4 } = require('uuid');

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
  return error => {
    const logger = debugConsole(location);
    logger(error);
    const log = {
      id: uuidv4(),
      timestamp: Date.now(),
      error: error,
      location: location
    };
    db.insert(ERRORS, log);
  };
}

function storeRequest(request) {
    const log = {
        id: uuidv4(),
        timestamp: Date.now(),
        url: request.url,
        body: request.body
    }
    db.insert(REQUESTS, log);
}

function getLogs() {
  return db.select(LOGS, () => true);
}

module.exports = { debug, error, storeRequest };
