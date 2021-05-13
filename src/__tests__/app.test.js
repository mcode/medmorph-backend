const request = require('supertest');
const app = require('../app');
const configUtil = require('../storage/configUtil');
describe('Test the root path', () => {
  test('It should response the GET method', () => {
    configUtil.setAdminToken('admin');
    return request(app)
      .get('/index')
      .set('Authorization', 'Bearer admin')
      .send()
      .expect(200, 'Howdy from test service!');
  });
});
