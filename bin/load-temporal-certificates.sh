#!/bin/bash
#
# See https://docs.temporal.io/cli#environment-variables

load_cert() {
    echo "Loading secret $1 into $2"
    gcloud secrets versions access latest --secret="$1" > "$2"
}

load_cert "tmprl_staging_zeno-worker_crt" /tmp/tmprl_staging_zeno-worker_crt.pem
load_cert "tmprl_staging_zeno-worker_key" /tmp/tmprl_staging_zeno-worker_key.pem

cat << EOF
Certificates downloaded. Please set the following environment variables:

export "TEMPORAL_NAMESPACE=staging.i16ci"
export "TEMPORAL_ADDRESS=staging.i16ci.tmprl.cloud:7233"
export "TEMPORAL_TLS_CERT=/tmp/tmprl_staging_zeno-worker_crt.pem"
export "TEMPORAL_TLS_KEY=/tmp/tmprl_staging_zeno-worker_key.pem"

Then, try the following command to verify the connection:

temporal workflow list --limit 5
EOF
