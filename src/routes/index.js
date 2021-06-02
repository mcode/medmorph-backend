const express = require('express');
const router = express.Router();
const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');

const db = require('../storage/DataAccess');
const testService = require('../services/test_service');
const publicKey = require('../keys/publicKey.json');
const { getPlanDef, getBaseUrlFromFullUrl } = require('../utils/fhir');
const { refreshAllKnowledgeArtifacts } = require('../utils/knowledgeartifacts');
const { startReportingWorkflow } = require('../utils/reporting_workflow');
const { compareUrl } = require('../utils/url');

router.get('/', testService);

router.post('/fetch-ka', (_req, res) => {
  refreshAllKnowledgeArtifacts();
  res.sendStatus(StatusCodes.OK);
});

router.post('/trigger', (req, res) => {
  const { resource, planDefFullUrl } = req.body;
  const planDef = getPlanDef(planDefFullUrl);
  const kaBaseUrl = getBaseUrlFromFullUrl(planDefFullUrl);

  if (!planDef) {
    res.sendStatus(StatusCodes.NOT_FOUND);
    return;
  }

  // Save new resource to the DB
  if (!resource.id) resource.id = uuidv4();
  const resourceFullUrl = `${process.env.BASE_URL}/${resource.resourceType}/${resource.id}`;
  const collection = `${resource.resourceType.toLowerCase()}s`;
  db.upsert(collection, { fullUrl: resourceFullUrl, resource: resource }, r =>
    compareUrl(r.fullUrl, resourceFullUrl)
  );

  startReportingWorkflow(planDef, kaBaseUrl, resource);
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;
