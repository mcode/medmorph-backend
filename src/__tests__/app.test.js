const request = require('supertest');
const app = require('../app');

describe('Test the root path', () => {
  test('It should response the GET method', () => {
    return request(app)
      .get('/')
      .set('Authorization', 'Bearer admin')
      .send()
      .expect(200, 'Howdy from test service!');
  });
});
