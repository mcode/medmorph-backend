const express = require('express');
const router = express.Router();

const messagingService = require('../services/messaging');
const db = require('../storage/DataAccess');

router.post('/[$]process-message', messagingService.processMessage);

router.get('/PlanDefinition', (_req, res) => {
  const planDefs = db.select('plandefinitions', () => true);
  res.send(planDefs);
});

module.exports = router;
