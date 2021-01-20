const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const db = require('../storage/DataAccess');
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

function getPlanDef(id) {
  // dummy function for getting the PlanDefinition
  // which can contain information to inform
  // the app what to do when notified
  const resultList = db.select(COLLECTION, s => s.id === id);
  if (resultList[0]) {
    return resultList[0];
  } else {
    return null;
  }
}

function getSubscription(id) {
  // retrieve the subscription
  // this can be through a FHIR request
  // or it can be stored with the planDef
  return {
    resourceType: 'Subscription',
    id: id + 'Subscription',
    criteria: 'Patient?_id=1',
    channel: {
      type: 'rest-hook',
      endpoint: 'http://example.com/subscription/1234',
      header: ['content-type: application/fhir+json']
    }
  };
}
function usePlanDef(planDef, resource = null) {
  // trigger criteria
  const subscriptionResource = getSubscription(planDef.id);
  // const criteria = subscriptionResource.criteria;
  if (subscriptionResource.channel.type === 'rest-hook') {
    const header = {};
    if (subscriptionResource.channel.header) {
      subscriptionResource.channel.header.forEach(element => {
        const pair = element.split(':');
        header[pair[0]] = pair[1];
      });
    }

    if (resource) {
      // TODO
    }
  }

  // TODO: Make the client do something based on the action/resource/criteria
  // const action = subscription.action;
}

module.exports = router;
