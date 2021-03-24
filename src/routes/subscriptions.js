const express = require('express');
const router = express.Router();
const notificationService = require('../services/subscriptions');

/**
 * Notification from KA Repo to refresh artifacts. The id param is the
 * server id from the database
 */
router.post('/ka/:id', notificationService.knowledgeArtifact);

/**
 * Notification from KA Repo to refresh artifacts. The id param is the
 * server id from the database and resourceId is the PlanDefinition id.
 * The body contains the triggering PlanDefinition
 */
router.put('/ka/:id/:resource/:resourceId', notificationService.knowledgeArtifact);

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition id which defines the workflow
 */
router.post('/:fullUrl', notificationService.reportTrigger);

/**
 * Notification from EHR of changed data to start workflow process. The
 * id param is the PlanDefinition if which defines the workflow. The body
 * contains the triggering resource.
 */
router.put('/:fullUrl/:resource/:resourceId', notificationService.reportTrigger);

module.exports = router;
