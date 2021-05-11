# MedMorph Backend Service Client

Reference implementation of the MedMorph Backend Service Client

## About MedMorph

> The Making EHR Data More Available for Research and Public Health (MedMorph) project seeks to advance public health and patient-centered outcomes by using emerging health data and exchange standards, such as Health Level 7 (HL7) Fast Healthcare Interoperability Resources (FHIR) and Clinical Quality Language (CQL), to develop and implement an interoperable solution that will enable access to clinical data. The MedMorph project fits within the Centers for Disease Control and Prevention (CDC) strategic imperative of transforming how data are collected, used, and shared through modern Information Technology (IT) capabilities to save lives and improve health. The MedMorph project is funded by the Health and Human Services (HHS) Assistant Secretary for Planning and Evaluation (ASPE) Patient-Centered Outcomes Research Trust Fund (PCORTF) and executed by the Center for Surveillance, Epidemiology, and Laboratory Services (CSELS) Public Health Informatics Office (PHIO) to advance research and public health goals. 

https://build.fhir.org/ig/HL7/fhir-medmorph/index.html


## Running the Client

The Backend Service Client is provided as a NodeJS Express app. NodeJS is required to to run the app.

```sh
git clone https://github.com/mcode/medmorph-backend
cd medmorph-backend
npm install
npm start
```

With default settings, the app will now be running at `http://localhost:3000`

The Backend Service Client can also be run using docker.  Make sure you have docker installed and running, then build the image and run the client.

```./build-docker-image.bat
docker-compose up
```

The app will now be running at `http://localhost:3000`.
### Configuration Requirements

Certain configuration properties can be set or changed. Some of these properties can be set as enviornment variables, the easiest way to do this is to set them in an environment file, `.env`. A sample file is provided in this repo as `.env.dev` (you will need to rename/copy this into the `.env` file for it to work).  Other configuration properties can be changed via the UI.  The `config.js` file sets the default for all the config variables changeable by the UI, but will not override values already persisted in the database.
##### Environment Variables
| ENV | Required | Description |
| --- | -------- | ----------- |
| PORT | No | The port number for the server. Defaults to 3000 if not provided. |
| DEBUG | No | Set to `medmorph-backend:*` to enable debug loggers for the app. |
| BASE_URL | Yes | The base url for this server. |

```env
# Port number for the server, defaults to 3000 if not provided
PORT=3001

# This server base url (required)
BASE_URL=http://localhost:3000

# Enabled debug loggers
# The app uses the debug library, see: https://github.com/visionmedia/debug
# "The DEBUG environment variable is then used to enable these based on space or comma-delimited names."
# Enable all express loggers with DEBUG=*
# Enable all loggers for just the app with DEBUG=medmorph-backend:*
DEBUG=medmorph-backend:*
```

##### Config Variables

| CONFIG | Required | Description |
| ------ | -------- | ----------- |
| AUTH_CERTS_URL | Yes | Endpoint hosting the public JWK Set of the Auth server  |
| AUTH_TOKEN_URL | Yes | Endpoint for requesting an access token through the use of an OAuth 2.0 client credentials flow |
| DATA_TRUST_SERVICE | Yes | The base url for the data/trust service server. |
| ADMIN_TOKEN | No | The value of the admin token to bypass authorization. If unset no admin token can be used. |
| AUTH_REQUIRED_FOR_OUTGOING | No | If false, the backend app will not acquire an access token before sending requests to other servers. Defaults to true if unset. |

Check the `config.js` file to find the default value for each property or set new ones.
### Server Requirements

The app expects at the minimum a single EHR server. There should also be at least one KA server and one PHA server for anything meaningful to happen. More details and examples can be found on the [Collections Wiki](https://github.com/mcode/medmorph-backend/wiki/Collections)

# License
Copyright 2020-2021 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
