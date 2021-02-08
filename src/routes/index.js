const express = require('express');
const router = express.Router();
const { StatusCodes } = require('http-status-codes');

const db = require('../storage/DataAccess');
const testService = require('../services/test_service');
const publicKey = require('../keys/publicKey.json');
const { refreshKnowledgeArtifacts } = require('../utils/fhir');

router.get('/', testService);

router.post('/fetch-ka', (req, res) => {
  refreshKnowledgeArtifacts(db);
  res.sendStatus(StatusCodes.OK);
});

router.get('/jwks', (req, res) => {
  res.send(publicKey);
});

/* Start of what to Remove this after PR Approved - Testing purposes */
const AuthorizationPersistance = require('../utils/AuthorizationPersistance');
let p = new AuthorizationPersistance.AuthorizationPersistance();
const server1 = {
  id: 12345,
  name: 'test1'
};
const server2 = {
  id: 23456,
  name: 'test2'
};

const serConfig1 = {
  jwks_url: 'www.example.com/token'
};

const config1 = {
  cId: 123,
  alg: 'RS384'
};

const token1 = {
  jwt: 'bearer asdf1234',
  exp: Date.now() + 500
};

const token2 = {
  jwt: 'bearer asdf1234',
  exp: Date.now() + 500
};

const token3 = {
  jwt: 'bearer asdf1234',
  exp: Date.now()
};

const key1 = {
  key: '123keyabc'
};

p.addServer(server1);
p.addServer(server2);
let a = p.getServerConfiguration(server1);
let b = p.getServerConfiguration(server2);
console.log('server1 input:');
console.log(server1);
console.log('get server1:');
console.log(a[0]);
console.log('server1 === return?');
console.log(a[0] === server1);
console.log('');

console.log('server2 input:');
console.log(server2);
console.log('get server2:');
console.log(b[0]);
console.log('server2 === return?');
console.log(b[0] === server2);
console.log('');

console.log('server1 add Config:');
console.log(serConfig1);
p.addServerConfiguration(server1, serConfig1);
let c = p.getServerConfiguration(server1);
console.log('get server1 config:');
console.log(c);
console.log('');

console.log('server1 add client Config:');
console.log(config1);
p.addClientConfiguration(server1, config1);
let z = p.getClientConfiguration(server1);
console.log('get server1 config:');
console.log(z);
console.log('');

console.log('server1 add token:');
console.log(token1);
p.addAccessToken(server1, token1);
let d = p.getAccessToken(server1);
console.log('get server1 token:');
console.log(d);
console.log('');

console.log('server2 add token:');
console.log(token2);
p.addAccessToken(server2, token2);
let y = p.getAccessToken(server2);
console.log('get server2 token:');
console.log(y);
console.log('');

console.log('server2 add expired token:');
console.log(token3);
p.addAccessToken(server2, token3);
let x = p.getAccessToken(server2);
console.log('get server2 token:');
console.log(x);
console.log('');

p.clearTokens(server1);
let e = p.getAccessToken(server1);
console.log('server1 clear tokens and get:');
console.log(e);
console.log('');

console.log('server1 get keys when empty:');
let f = p.getServerKeys(server1);
console.log(f);
console.log('server1 add key:');
console.log(key1);
p.addServerKeys(server1, key1);
let g = p.getServerKeys(server1);
console.log('server1 get key:');
console.log(g);
console.log('');
/* End Remove */

module.exports = router;
