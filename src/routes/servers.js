const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();
const servers = require('../storage/servers');

// GET /
// List all servers
router.get('/', (req, res) => {
  const result = servers.getServers();
  res.send(result);
});

// POST /
// Add a new server
router.post('/', (req, res) => {
  const newItem = req.body;
  servers.addServer(newItem);
  res.status(StatusCodes.CREATED).send(newItem);
});

// GET /:id
// Read a single server
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const resultList = servers.getServerById(id);
  if (resultList[0]) {
    res.send(resultList[0]);
  } else {
    res.sendStatus(StatusCodes.NOT_FOUND); // 404
  }
});

// PUT /:id
// update
router.put('/:id', (req, res) => {
  if (req.params.id !== req.body.id) {
    res.status(StatusCodes.CONFLICT).send(`server id does not match URL id`);
    return;
  }

  servers.addServer(req.body);
  res.sendStatus(StatusCodes.OK); // 200
});

// DELETE /:id
// Remove a server
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  servers.deleteServer(id);
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;
