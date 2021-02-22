#!/bin/sh

# load the .env file to regular variables
# see https://stackoverflow.com/a/30969768
set -o allexport
source .env
set +o allexport

if [ -z "$BASE_URL" ]
then
  echo ERROR: BASE_URL is not set as environment variable, or in .env
  exit 1
fi

# now $BASE_URL should be set
# check for a trailing slash, http://host//servers doesn't work
# ie, no double slash allowed
if [ "${BASE_URL:${#BASE_URL}-1:1}" = "/" ]
then
  # last character is a slash
  servers="servers"
  URL="$BASE_URL$servers"
else
  URL="$BASE_URL/servers"
fi

# server collection format
# https://github.com/mcode/medmorph-backend/wiki/Collections#servers
   # name: String // human readable name
   # endpoint: String // FHIR base url
   # type: 'KA' | 'EHR' | 'PHA' // type of server the endpoint is
   # clientId: String // the client id returned when the backend app registered with this server
   # token: String | null // access token if one exists
   # tokenExp: number | null // the time the token expires (seconds from epoch)

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--type) type="$2"; shift;;
        -n|--name) servername="$2"; shift;;
        -c|--clientid) clientid="$2"; shift;;
        -e|--endpoint) endpoint="$2"; shift;;
        *) echo ERROR: Unknown argument $1 ; exit 1 ;
    esac
    shift
done

if [ -z "$endpoint" ]
then
  echo ERROR: Required parameter -e/--endpoint is missing
  exit 1
fi

# if a name wasn't provided, use the endpoint URL as the name
if [ -z "$servername" ]
then
  servername=$endpoint
fi

# can we add other types besides KA?
SERVER_JSON="{\
  \"endpoint\": \"$endpoint\",
  \"name\": \"$servername\",
  \"type\": \"$type\",
  \"clientId\": \"$clientid\"
}"

# echo $SERVER_JSON

curl --data  "$SERVER_JSON" -H "Authorization: Bearer admin" $URL
echo # just add a newline for friendliness