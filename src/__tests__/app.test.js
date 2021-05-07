const request = require('supertest');
const app = require('../app');
const config = require('../storage/config');
describe('Test the root path', () => {
  test('It should response the GET method', () => {
    config.setAdminToken('admin');
    return request(app)
      .get('/index')
      .set('Authorization', 'Bearer admin')
      .send()
      .expect(200, 'Howdy from test service!');
  });
});
