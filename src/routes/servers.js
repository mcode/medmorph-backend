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

// https://stackoverflow.com/a/2117523
// replace this with a real library if we find more uses for uuids
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// POST /
// Add a new server
router.post('/', (req, res) => {
  const newItem = req.body;

  if (!newItem.id) {
    newItem.id = uuidv4();
  }

  db.insert(COLLECTION, newItem);
  res.sendStatus(201);
});

// GET /:id
// Read a single server
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const resultList = db.select(COLLECTION, s => s.id === id);
  if (resultList[0]) {
    res.send(resultList[0]);
  } else {
    res.sendStatus(404);
  }
});

// PUT /:id
// update
router.put('/:id', (req, res) => {
  if (req.params.id !== req.body.id) {
    res.status(409).send(`server id does not match URL id`);
    return;
  }

  // NOTE - this assumes the entry already exists
  // for a more rigorous API we should either check first,
  // or use an "upsert"-type function within the DB
  const id = req.params.id;
  db.update(
    COLLECTION,
    s => s.id === id,
    s => Object.assign(s, req.body)
  );
  res.sendStatus(200);
});

// DELETE /:id
// Remove a server
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.delete(COLLECTION, s => s.id === id);
  res.sendStatus(200);
});

module.exports = router;
