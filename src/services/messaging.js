const { StatusCodes } = require('http-status-codes');
const { generateOperationOutcome } = require('../utils/fhir');

function processMessage(req, res) {
  const messageBundle = req.body;
  const messageHeader = messageBundle.entry[0].resource;

  // Validate message
  if (!messageBundle || !messageHeader) {
    sendOperationOutcome(res, 'required', 'No message bundle or message header found');
    return;
  } else if (messageBundle.type !== 'message') {
    sendOperationOutcome(
      res,
      'invalid',
      `Received bundle of type '${messageBundle.type}'. Must be type 'message'.`
    );
    return;
  } else if (
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
