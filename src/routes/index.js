const express = require('express');
const router = express.Router();
const keys = require('../keys/privateKey.json');
const { StatusCodes } = require('http-status-codes');

const db = require('../storage/DataAccess');
const testService = require('../services/test_service');
const { refreshKnowledgeArtifacts } = require('../utils/fhir');

router.get('/', testService);

router.post('/fetch-ka', (req, res) => {
  refreshKnowledgeArtifacts(db);
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;

const client = require('../utils/client');

const newClient = new client.Client(keys);

newClient.connectToServer('http://pathways.mitre.org:8180/fhir');
newClient.connectToServer('http://pathways.mitre.org:8190/fhir');
