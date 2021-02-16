const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const db = require('../storage/DataAccess');
const { startReportingWorkflow } = require('../utils/reporting_workflow');

const COLLECTION = 'plandefinitions';

// POST /
// Recieve subscription notification
router.post('/:id', (req, res) => {
  const id = req.params.id;
  const planDef = getPlanDef(id);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    startReportingWorkflow(planDef);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

// if the subscription returns a resource, the notification
// will be a PUT instead of a POST
router.put('/:id/:resource/:resourceId', (req, res) => {
  const id = req.params.id;
  const planDef = getPlanDef(id);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    startReportingWorkflow(planDef, req.body);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

/**
 * Retrieves the PlanDefinition with the given id from the db
 *
 * @param {string} id - the id of the PlanDefinition
 * @returns the PlanDefinition with the given id or null if not found
 */
function getPlanDef(id) {
  const resultList = db.select(COLLECTION, s => s.id === id);
  if (resultList[0]) return resultList[0];
  else return null;
}

module.exports = router;
