#!/bin/bash

if ! command -v vertesia &> /dev/null; then
    echo 'Vertesia CLI is not installed. Please install it first: npm install -g @vertesia/cli'
    exit 1
fi

if [ -z "${VT_API_KEY}" ]; then
    echo 'VT_API_KEY environment variable is not set'
    exit 1
fi

VT_ENV=staging
VT_ACCOUNT=652d77895674c387e105948c  # Dengen Labs
VT_PROJECT=654df9de09676ad3b8631dc3  # Experiments
VT_PROFILE=staging-experiments # note: this should match the field ".vertesia.profile" in the agent's "package.json" file.

echo "Connecting to Vertesia private NPM registry"

if vertesia profiles | grep -q "${VT_PROFILE}"; then
    echo "Profile \"${VT_PROFILE}\" already exists"
    vertesia profiles use "$VT_PROFILE"
else
    echo "Profile \"${VT_PROFILE}\" does not exist, creating it"
    vertesia profiles create "$VT_PROFILE" \
            --target "$VT_ENV" \
            --account "$VT_ACCOUNT" \
            --project "$VT_PROJECT" \
            --apikey "$VT_API_KEY"
fi

cd apps/github-agent || exit
vertesia agent connect --profile "${VT_PROFILE}" --non-interactive
echo "Connected to Vertesia private NPM registry"
