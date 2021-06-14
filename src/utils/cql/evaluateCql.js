const { Client } = require('cql-translation-service-client');
const { Library, Executor, Repository } = require('cql-execution');
const { PatientSource } = require('cql-exec-fhir');
const atob = require('atob');
const axios = require('axios');
const { ValueSetLoader } = require('./ValueSetLoader');

// TODO: Add url to config
const client = new Client(
  'http://moonshot-dev.mitre.org:8080/cql/translator?annotations=true&result-types=true'
);

async function evaluateCQL(resources, expression, library, patientId) {
  const elm = await fetchELM(library);
  const valueSetLoader = new ValueSetLoader(library);
  const valueSetMap = await valueSetLoader.seedValueSets();
  const result = executeElm(resources, elm, valueSetMap);
  return result[patientId][expression] === 1;
}

async function fetchELM(library) {
  // getting the elm and decoding the data components
  const contentInfoElm = library.content?.find(x => x.contentType === 'application/elm+json');

  const contentInfoTranslate = library.content?.find(x => x.contentType === 'text/cql');
  if (contentInfoElm && contentInfoElm.data) {
    return JSON.parse(atob(contentInfoElm.data));
  } else if (contentInfoTranslate && contentInfoTranslate.data) {
    // Convert cql to elm if it isn't provided
    const decoded = atob(contentInfoTranslate.data);
    return await client.convertBasicCQL(decoded);
  } else if (contentInfoElm && contentInfoElm.url) {
    const response = await axios.get(contentInfoElm.url);
    return response.data;
  } else if (contentInfoTranslate && contentInfoTranslate.url) {
    const response = await axios.get(contentInfoTranslate.url);
    return await client.convertBasicCQL(response.data);
  } else {
    throw new Error('Could not fetch ELM off of Library resource');
  }
}

/**
 * Engine function that takes in a patient file (JSON) and an ELM file,
 * running the patient against the ELM file
 * @param patientRecord - FHIR bundle containing patient's record
 * @param elm - ELM structure (previosuly converted from CQL) on which the patient will be run.
 * @return returns a JSON object which is the result of analyzing the patient against the elm file
 */
function executeElm(patientRecord, elm, libraries) {
  let lib;
  if (libraries) {
    lib = new Library(elm, new Repository(libraries));
  } else {
    lib = new Library(elm);
  }

  const executor = new Executor(lib);
  const psource = new PatientSource.FHIRv401(patientRecord);
  psource.loadBundles(patientRecord);
  const result = executor.exec(psource);
  return result;
}

module.exports = { evaluateCQL };
