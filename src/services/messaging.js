const { StatusCodes } = require('http-status-codes');
const { generateOperationOutcome, forwardMessageResponse } = require('../utils/fhir');
const debug = require('debug')('medmorph-backend:server');

function processMessage(req, res) {
  // Validate the message bundle
  const messageBundle = req.body;
  if (!messageBundle) {
    sendOperationOutcome(res, 'required', 'No message bundle found in body');
    return;
  } else if (messageBundle.type !== 'message') {
    sendOperationOutcome(
      res,
      'invalid',
      `Received bundle of type '${messageBundle.type}'. Must be type 'message'.`
    );
    return;
  } else if (!messageBundle.entry?.length) {
    sendOperationOutcome(res, 'invalid', 'Message bundle must have entries');
    return;
  }

  // Validate the message header
  const messageHeader = messageBundle.entry[0].resource;
  if (
    messageHeader.destination &&
    !messageHeader.destination.some(d => d.endpoint.includes(req.headers.host))
  ) {
    sendOperationOutcome(
      res,
      'security',
      `Host ${req.headers.host} is not in list of destinations`
    );
    return;
  } else if (!messageHeader.response) {
    sendOperationOutcome(res, 'required', 'Message has no response');
    return;
  }

  forwardMessageResponse(messageBundle).then(() =>
    debug(`Response to /Bundle/${messageBundle.id} forwarded to EHR`)
  );

  res.sendStatus(StatusCodes.OK);
}

function sendOperationOutcome(res, code, msg) {
  const operationOutcome = generateOperationOutcome(code, msg);
  res
    .status(StatusCodes.BAD_REQUEST)
    .header('Content-Type', 'application/json')
    .send(JSON.stringify(operationOutcome, undefined, 2));
}

module.exports = { processMessage };
