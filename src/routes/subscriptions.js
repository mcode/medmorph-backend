const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const db = require('../storage/DataAccess');
const { initializeContext, executeWorkflow } = require('../utils/reporting_workflow');

const COLLECTION = 'plandefinitions';

// POST /
// Recieve subscription notification
router.post('/:id', (req, res) => {
  const id = req.params.id;
  const planDef = getPlanDef(id);
  if (planDef) {
    res.sendStatus(StatusCodes.OK);
    usePlanDef(planDef);
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
    usePlanDef(planDef, req.body);
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

/**
 * Function to use the PlanDefinition and triggering resource to create a report
 *
 * @param {PlanDefinition} planDef - the PlanDefinition resource
 * @param {*} resource - the resource which triggered the notification
 */
function usePlanDef(planDef, resource = null) {
  // TODO: MEDMORPH-49 to make sure the resource is always included
  if (!resource) return;

  const context = initializeContext(planDef);
  executeWorkflow(context);
}

module.exports = router;
