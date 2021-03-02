const express = require('express');
const router = express.Router();
const { StatusCodes } = require('http-status-codes');

const db = require('../storage/DataAccess');
const testService = require('../services/test_service');
const publicKey = require('../keys/publicKey.json');
const { refreshAllKnowledgeArtifacts } = require('../utils/fhir');

router.get('/', testService);

router.post('/fetch-ka', (req, res) => {
  refreshAllKnowledgeArtifacts(db);
  res.sendStatus(StatusCodes.OK);
});

router.get('/jwks', (req, res) => {
  res.send(publicKey);
});

module.exports = router;
