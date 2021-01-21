const express = require('express');
const router = express.Router();
const keys = require('../utils/privateKey.json');
const { StatusCodes } = require('http-status-codes');

const db = require('../storage/DataAccess');
const testService = require('../services/test_service');
const { refreshKnowledgeArtifacts } = require('../utils/fhir');
const axios = require('axios');
const queryString = require('query-string');

router.get('/', testService);

router.post('/fetch-ka', (req, res) => {
  refreshKnowledgeArtifacts(db);
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;

const client = require('../utils/client');

let newClient = new client.Client(keys);

this.jwt = null;

newClient
  .generateJWT(
    'medmorph_backend',
    'http://moonshot-dev.mitre.org:8090/auth/realms/ehr/protocol/openid-connect/token',
    'kccynW65-cFRhVTzn6PU5c4GkHCIDzXRgwS56qVzG3M'
  )
  .then(jwt => {
    this.jwt = jwt;
    console.log(this.jwt);

    const props = {
      scope: 'offline_access',
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwt
    };

    const headers = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        Accept: '*/*'
      }
    };

    axios
      .post(
        'http://moonshot-dev.mitre.org:8090/auth/realms/ehr/protocol/openid-connect/token',
        queryString.stringify(props),
        headers
      )
      .then(response => {
        let accessToken = response.data.access_token;
        const headers = {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            Accept: '*/*',
            Authorization: 'Bearer ' + accessToken
          }
        };
        console.log(response.data.access_token);
        console.log(headers);

        axios.get('http://pathways.mitre.org:8180/fhir/Patient/pat01', headers).then(response => {
          console.log(response.data);
        });
      });
  });
