#!/bin/bash

ENV_JS="./config.js"

rm -rf ${ENV_JS}
touch ${ENV_JS}

echo "window = {" >> ${ENV_JS}
varname='API_BASE_URL'
value=$(printf '%s\n' "${!varname}")
echo "  $varname: \"$value\"," >> ${ENV_JS}
echo "}" >> ${ENV_JS}