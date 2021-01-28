const express = require('express');
const router = express.Router();

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
