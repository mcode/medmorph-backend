const { Client } = require('cql-translation-service-client');
const { Library, Executor, Repository, CodeService } = require('cql-execution');
const { PatientSource } = require('cql-exec-fhir');
const atob = require('atob');
const axios = require('axios');
const { ValueSetLoader } = require('./ValueSetLoader');
const { LIBRARYS } = require('../../storage/collections');
const debug = require('../../storage/logs').debug('medmorph-backend:evaluateCql');
const db = require('../../storage/DataAccess');
const configUtil = require('../../storage/configUtil');

async function evaluateCQL(resources, expression, library, patientId) {
  const elm = library.elm || (await fetchELM(library));
  const valueSetLoader = new ValueSetLoader(library);
  const valueSetMap = await valueSetLoader.seedValueSets();
  const result = executeElm(resources, elm, valueSetMap);
  return result.patientResults[patientId][expression] === true;
}

async function fetchELM(library) {
  const client = new Client(configUtil.getCqlWebServiceUrl());
  const { resource } = library;
  let elm;

  // getting the elm and decoding the data components
  const contentInfoElm = resource.content?.find(x => x.contentType === 'application/elm+json');
  const contentInfoTranslate = resource.content?.find(x => x.contentType === 'text/cql');
  if (contentInfoElm && contentInfoElm.data) {
    elm = JSON.parse(atob(contentInfoElm.data));
  } else if (contentInfoTranslate && contentInfoTranslate.data) {
    // Convert cql to elm if it isn't provided
    const decoded = atob(contentInfoTranslate.data);
    elm = await client.convertBasicCQL(decoded);
  } else if (contentInfoElm && contentInfoElm.url) {
    const response = await axios.get(contentInfoElm.url);
    elm = response.data;
  } else if (contentInfoTranslate && contentInfoTranslate.url) {
    const response = await axios.get(contentInfoTranslate.url);
    elm = await client.convertBasicCQL(response.data);
  } else {
    throw new Error('Could not fetch ELM off of Library resource');
  }

  // Add converted ELM to database
  db.upsert(LIBRARYS, { ...library, elm }, l => l.fullUrl === library.fullUrl);
  debug(`Library/${resource.id} saved to db`);
  return elm;
}

/**
 * Engine function that takes in a patient file (JSON) and an ELM file,
 * running the patient against the ELM file
 * @param patientRecord - FHIR bundle containing patient's record
 * @param elm - ELM structure (previosuly converted from CQL) on which the patient will be run.
 * @return returns a JSON object which is the result of analyzing the patient against the elm file
 */
function executeElm(patientRecord, elm, valueSets) {
  let lib;
  if (valueSets) {
    lib = new Library(elm, new Repository(valueSets));
  } else {
    lib = new Library(elm);
  }

  const codeService = new CodeService(valueSets);
  const executor = new Executor(lib, codeService);
  const psource = new PatientSource.FHIRv401(patientRecord);
  psource.loadBundles(patientRecord);
  const result = executor.exec(psource);
  return result;
}

module.exports = {
  evaluateCQL,
  fetchELM
};
