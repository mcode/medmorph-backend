const db = require('../storage/DataAccess');
const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { default: base64url } = require('base64url');
const e = require('express');

function createHandler(collectionName, req, res) {
  const newItem = req.body;
  db.insert(collectionName, newItem);
  res.status(StatusCodes.CREATED).send(newItem);
}

function getHandler(collectionName, req, res) {
  let result;
  if (req.query.id) result = getByIdHandler(collectionName, req.query.id);
  else if (req.query.fullUrl) result = getByFullUrlHandler(collectionName, req.query.fullUrl);
  else result = db.select(collectionName, () => true);
  result ? res.send(result) : res.sendStatus(StatusCodes.NOT_FOUND);
}

function getByIdHandler(collectionName, id) {
  const result = db.select(collectionName, r => r.id === id);
  return result[0] ? result[0] : undefined;
}

function getByFullUrlHandler(collectionName, encodedFullUrl) {
  const fullUrl = base64url.decode(encodedFullUrl);
  const result = db.select(collectionName, r => r.fullUrl === fullUrl);
  return result[0] ? result[0] : undefined;
}

function updateHandler(collectionName, req, res) {
  const changedItem = req.body;
  if (req.query.id) db.upsert(collectionName, changedItem, r => r.id === req.query.id);
  else if (req.query.fullUrl) {
    const fullUrl = base64url.decode(req.query.fullUrl);
    db.upsert(collectionName, changedItem, r => r.fullUrl === fullUrl);
  } else {
    res.send('Must include id or fullUrl').status(StatusCodes.BAD_REQUEST);
    return;
  }

  res.send(StatusCodes.OK);
}

function deleteHandler(collectionName, req, res) {
  if (req.query.id) db.delete(collectionName, r => r.id === req.query.id);
  else if (req.query.fullUrl) {
    const fullUrl = base64url.decode(req.query.fullUrl);
    db.delete(collectionName, r => r.fullUrl === fullUrl);
  } else {
    res.send('Must include id or fullUrl').status(StatusCodes.BAD_REQUEST);
    return;
  }

  res.send(StatusCodes.OK);
}

function genericController(collectionName) {
  const router = express.Router();

  router.post('/', (req, res) => {
    createHandler(collectionName, req, res);
  });

  router.get('/', (req, res) => {
    getHandler(collectionName, req, res);
  });

  router.put('/', (req, res) => {
    updateHandler(collectionName, req, res);
  });

  router.delete('/', (req, res) => {
    deleteHandler(collectionName, req, res);
  });

  return router;
}

module.exports = { genericController };
