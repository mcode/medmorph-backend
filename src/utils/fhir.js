const axios = require('axios');
const debug = require('debug')('medmorph-backend:server');

/**
 * Helper method to create an OperationOutcome fwith a message
 *
 * @param {IssueType} code - the IssueType code
 * @param {string} msg - message to include in the text
 */
function generateOperationOutcome(code, msg) {
  return {
    resourceType: 'OperationOutcome',
    text: {
      status: 'generated',
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">ERROR</td><td>[]</td><td><pre>${msg}</pre></td>\n\t\t\t\t\t\n\t\t\t\t\n\t\t\t</tr>\n\t\t</table>\n\t</div>` // eslint-disable-line
    },
    issue: [
      {
        severity: 'error',
        code: code
      }
    ]
  };
}

/**
 * Helper method to GET resources (and all included references) from a FHIR server
 *
 * @param {string} server - the sourse server base url
 * @param {string} type - the type of the resource
 * @param {string[]} ids - (optional) list of ids to get
 * @returns promise of axios data
 */
function getResources(server, type, ids = null) {
  const id_param = ids ? `&_id=${ids.join(',')}` : '';
  const url = `${server}/${type}?_include=*${id_param}`;
  const headers = { Authorization: 'Bearer admin' }; // TODO: get an access token
  return axios
    .get(url, { headers: headers })
    .then(response => response.data)
    .catch(err => console.log(err));
}

/**
 * Get all knowledge artifacts (from servers registered in the config
 * file) and save them. Stores all refrenced resources as well.
 */
function refreshKnowledgeArtifacts(db) {
  const servers = db.select('servers', s => s.type === 'KA');
  servers.forEach(server => {
    getResources(server.endpoint, 'PlanDefinition').then(data => {
      debug(`Fetched ${server.endpoint}/${data.resourceType}/${data.id}`);
      if (data.entry?.length === 0) return;
      const resources = data.entry.map(entry => entry.resource);
      resources.forEach(resource => {
        const collection = `${resource.resourceType.toLowerCase()}s`;
        db.upsert(collection, resource, r => r.id === resource.id);
      });
    });
  });
}

module.exports = { generateOperationOutcome, refreshKnowledgeArtifacts };
