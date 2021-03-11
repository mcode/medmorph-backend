const db = require('../storage/DataAccess');
const express = require('express');
const { StatusCodes } = require('http-status-codes');

function createHandler(collectionName, req, res) {
  const newItem = req.body;
  db.insert(collectionName, newItem);
  res.status(StatusCodes.CREATED).send(newItem);
}

function getAllHandler(collectionName, res) {
  res.send(db.select(collectionName, () => true));
}

function getByIdHandler(collectionName, req, res) {
  const { id } = req.params;
  const result = db.select(collectionName, r => r.id === id);
  result[0] ? res.send(result[0]) : res.sendStatus(StatusCodes.NOT_FOUND);
}

function updateHandler(collectionName, req, res) {
  const { id } = req.params;
  const changedItem = req.body;
  db.upsert(collectionName, changedItem, r => r.id === id);

  res.send(StatusCodes.OK);
}

function deleteHandler(collectionName, req, res) {
  const { id } = req.params;
  db.delete(collectionName, r => r.id === id);
  res.send(StatusCodes.OK);
}

function genericController(collectionName) {
  const router = express.Router();

  router.post('/', (req, res) => {
    createHandler(collectionName, req, res);
  });

  router.get('/', (_, res) => {
    getAllHandler(collectionName, res);
  });

  router.get('/:id', (req, res) => {
    getByIdHandler(collectionName, req, res);
  });

  router.put('/:id', (req, res) => {
    updateHandler(collectionName, req, res);
  });

  router.delete('/:id', (req, res) => {
    deleteHandler(collectionName, req, res);
  });

  return router;
}

module.exports = { genericController };
