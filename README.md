# demo-github

This projects demonstrates the integration of GitHub Agent into the Composable as a collection of Agentic Workflows.

## Prerequisites

* You need to have access to Google Cloud project `dengenlabs` to fetch certificates for connecting to Temporal Cloud.
* You already installed and configured the Google Cloud CLI `gcloud`.
* You have `temporal` CLI installed.

## Quickstart

Set up the application using the `.env` file:

```sh
cp apps/github-agent/.env.template apps/github-agent/.env
# TODO: you need to update settings to adapt to your environment, especially the name of the
# envionment and the name of the application
```

Connect to private NPM registry and start the whole solution locally with either 1) `pnpm` or 2) `docker`.

**pnpm**:

```sh
# install internal packages
gcloud auth login
pnpm install --filter "@dglabs/demo-github-root"
pnpm registry-login
pnpm install

# build workspace
pnpm -r build

# start application
npn run dev
```

**docker**:

```sh
docker compose up --build
```

Connect to Temporal Cloud and trigger a workflow:

```sh
# /!\ IMPORTANT /!\
# follow the output of the scripts to export certificates
./bin/load-temporal-certificates.sh

# test if the certificates are loaded correctly
temporal workflow list --limit 5

# trigger a new workflow
temporal workflow start \
    -t vertesia-github-agent/desktop-mhuang \
    --type getRepos \
    -i '{"names": ["mincong-h/mincong-h.github.io", "mincong-h/learning-node"] }' \
    -w github-agent:get-repos
```

Inspect results from Temporal Cloud:

<img width="1512" alt="image" src="https://github.com/user-attachments/assets/340685ed-b595-47e1-aa6a-fd63263b2ba9" />

## Application

### Agent Entrypoint

In the `main.ts` file of the Agent, you need to run a Temporal Worker based on the package `@dglabs/agent-runner`. You can `run` the runner with options. Two entries are mandatory: the location of the workflow bundle and the list of activities.

* The workflow bundle is a standlone file which contains all the workflows and their underlying dependencies. You need to package the bundle yourself.
* The activities are functions are normal functions or method executions that are intended to execute a single, well-defined action (either short or long-running), such as querying a database, calling a third-party API, or transcoding a media file.

Here is the example from GitHub Agent:

```ts
// file: apps/github-agent/src/main.ts
import { run, WorkerRunOptions, resolveScriptFile } from "@dglabs/agent-runner";

const workflowBundle = await resolveScriptFile("@dglabs/github-agent/workflows-bundle", import.meta.url);
const activities = await import('./activities.js');

const options: WorkerRunOptions = {
    workflowBundle,
    activities,
};

await run(options).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});
```
