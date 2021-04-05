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

Certain configuration properties MUST be set via enviornment variables. The easiest way to do this is to set them in an environment file, `.env`. A sample file is provided in this repo as `.env.dev` (you will need to rename/copy this into the `.env` file for it to work).

| ENV | Required | Description |
| --- | -------- | ----------- |
| REALM | Yes | The Keycloak realm name. This is the url name which may be different than the text name. |
| AUTH | Yes | The Keycloak auth url. Will look something like `http://keycloak.example.com/auth`/ |
| PORT | No | The port number for the server. Defaults to 3000 if not provided. |
| DEBUG | No | Set to `medmorph-backend:*` to enable debug loggers for the app. |
| DATA_TRUST_SERVICE | Yes | The base url for the data/trust service server. |
| BASE_URL | Yes | The base url for this server. |
| ADMIN_TOKEN | No | The value of the admin token to bypass authorization. If unset no admin token can be used. |

```env
# Port number for the server, defaults to 3000 if not provided
PORT=3001

# Keycloak realm (required)
REALM=backend_app

# Keycloak auth url (required)
AUTH=http://moonshot-dev.mitre.org:8090/auth

# Data turst service url (required)
DATA_TRUST_SERVICE=http://localhost:3005

# This server base url (required)
BASE_URL=http://localhost:3000

# Enabled debug loggers
# The app uses the debug library, see: https://github.com/visionmedia/debug
# "The DEBUG environment variable is then used to enable these based on space or comma-delimited names."
# Enable all express loggers with DEBUG=*
# Enable all loggers for just the app with DEBUG=medmorph-backend:*
DEBUG=medmorph-backend:*
```

### Server Requirements

The app expects at the minimum a single EHR server. There should also be at least one KA server and one PHA server for anything meaningful to happen. More details and examples can be found on the [Collections Wiki](https://github.com/mcode/medmorph-backend/wiki/Collections)

# License
Copyright 2020 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
