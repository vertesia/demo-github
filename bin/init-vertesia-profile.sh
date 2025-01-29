#!/bin/bash

# All the env vars must be set
set -u

# Environment variables
#   - VT_API_KEY: Vertesia API token
#   - VT_ACCOUNT: Vertesia account ID
#   - VT_PROJECT: Vertesia project ID
#   - VT_ENV: Vertesia environment in which the interaction is defined
#   - VT_SITE: Vertesia site in which the interaction is defined
#   - VT_PROFILE: Vertesia profile name

mkdir -p ~/.vertesia
cat <<EOF >> ~/.vertesia/profiles.json
{
    "default": "${VT_PROFILE}",
    "profiles": [
        {
            "name": "${VT_PROFILE}",
            "config_url": "https://${VT_SITE}/cli",
            "account": "${VT_ACCOUNT}",
            "project": "${VT_PROJECT}",
            "studio_server_url": "https://studio-server-${VT_ENV}.api.vertesia.io",
            "zeno_server_url": "https://zeno-server-${VT_ENV}.api.vertesia.io",
            "apikey": "${VT_API_KEY}"
        }
    ]
}
EOF

echo "Vertesia profile created: ~/.vertesia/profiles.json"
