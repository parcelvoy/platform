#!/bin/bash

ENV_JS="./config.js"

rm -rf ${ENV_JS}
touch ${ENV_JS}

varname='API_BASE_URL'
value=$(printf '%s\n' "${!varname}")
echo "window.$varname = \"$value\";" >> ${ENV_JS}