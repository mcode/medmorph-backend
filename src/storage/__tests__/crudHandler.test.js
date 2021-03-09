const db = require('../DataAccess');
const { add, deleteById, getAll, getById, update } = require('../crudHandler');

describe('Test CRUD operations on internal data store', () => {
  const collectionName = 'stuff';
  const exampleItem = { id: 1, name: 'john doe', email: 'jdoe@example.com' };
  const exampleItem2 = { id: 2, name: 'jane doe', email: 'janedoe@example.com' };

  test('CRUD operations', () => {
    let result = db.select(collectionName, () => true);

    // Collection should be empty
    expect(result).toStrictEqual([]);

    // add
    add(collectionName, exampleItem, s => s.id === exampleItem.id);
    result = db.select(collectionName, row => row.name === exampleItem.name);
    expect(result).toHaveLength(1);

    // get
    const retrievedItem = getById(collectionName, exampleItem.id);
    expect(retrievedItem).toMatchObject(exampleItem);

    // update
    update(
      collectionName,
      s => s.id === exampleItem.id,
      s => (s.email = 'john_doe@example.com')
    );
    result = db.select(collectionName, row => row.name === exampleItem.name);
    expect(result[0]).toMatchObject({ id: 1, name: 'john doe', email: 'john_doe@example.com' });

    // add second item and test get all
    add(collectionName, exampleItem2, s => s.id === exampleItem2);
    const retrievedCollection = getAll(collectionName);
    expect(retrievedCollection).toHaveLength(2);

    // delete
    deleteById(collectionName, exampleItem.id);
    const deletedItem = getById(collectionName, exampleItem.id);
    expect(deletedItem).toBeUndefined();

    deleteById(collectionName, exampleItem2.id);
    result = db.select(collectionName, () => true);
    expect(result).toStrictEqual([]);
  });
});
