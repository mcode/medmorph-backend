const db = require('./DataAccess');

/**
 * Generic CRUD operations for database
 * @param {string} collectionName - The name of the collection to perform operation
 * @param {object} item - The item to add/update in collection
 * @param {function} whereFn - The function to identify row to perform operation
 * @param {function} updateFn - The function to apply to row on update
 */

function add(collectionName, item, whereFn) {
  db.upsert(collectionName, item, whereFn);
}

function deleteById(collectionName, id) {
  db.delete(collectionName, i => i.id === id);
}

function getAll(collectionName) {
  return db.select(collectionName, () => true);
}

function getById(collectionName, id) {
  return db.select(collectionName, i => i.id === id)[0];
}

function update(collectionName, whereFn, updateFn) {
  db.update(collectionName, whereFn, updateFn);
}

module.exports = {
  add,
  deleteById,
  getAll,
  getById,
  update
};
