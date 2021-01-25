const { v4: uuidv4 } = require('uuid');
const { StatusCodes } = require('http-status-codes');

const express = require('express');
const router = express.Router();

const db = require('../storage/DataAccess');

const COLLECTION = 'servers';

// GET /
// List all servers
router.get('/', (req, res) => {
  const result = db.select(COLLECTION, () => true);
  res.send(result);
});

// POST /
// Add a new server
router.post('/', (req, res) => {
  const newItem = req.body;

  if (!newItem.id) {
    newItem.id = uuidv4();
  }

  db.insert(COLLECTION, newItem);
  res.status(StatusCodes.CREATED).send(newItem);
});

// GET /:id
// Read a single server
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const resultList = db.select(COLLECTION, s => s.id === id);
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

  // NOTE - this assumes the entry already exists
  // for a more rigorous API we should either check first,
  // or use an "upsert"-type function within the DB
  const id = req.params.id;
  db.upsert(COLLECTION, req.body, s => s.id === id);
  res.sendStatus(StatusCodes.OK); // 200
});

// DELETE /:id
// Remove a server
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.delete(COLLECTION, s => s.id === id);
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;
