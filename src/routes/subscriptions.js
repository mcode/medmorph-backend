const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();

// POST /
// Recieve subscription notification
router.post('/:id', (req, res) => {
  const id = req.params.id;
  res.sendStatus(StatusCodes.OK);
  const subscription = getSubscription(id);
  useSubscription(subscription);
});

router.put('/:id/:resource/:resourceId', (req, res) => {
  const id = req.params.id;
  res.sendStatus(StatusCodes.OK);
  const subscription = getSubscription(id);
  useSubscription(subscription, req.body);
});
function getSubscription(id) {
  // dummy function for getting the subscription
  // which can contain information to inform
  // the app what to do when notified
  console.log(id);
  return {
    subscriptionResource: {
      resourceType: 'Subscription',
      criteria: 'Patient?_id=1',
      channel: {
        type: 'rest-hook',
        endpoint: 'http://example.com/subscription/1234',
        header: ['content-type: application/fhir+json']
      }
    },
    action: 'name'
  };
}
function useSubscription(subscription, resource = null) {
  // trigger criteria
  const subscriptionResource = subscription.subscriptionResource;
  // const criteria = subscriptionResource.criteria;
  if (subscriptionResource.channel.type === 'rest-hook') {
    const header = {};
    subscriptionResource.channel.header.forEach(element => {
      const pair = element.split(':');
      header[pair[0]] = pair[1];
    });

    if (resource) {
      // TODO
    }
  }

  // TODO: Make the client do something based on the action/resource/criteria
  // const action = subscription.action;
}

module.exports = router;
