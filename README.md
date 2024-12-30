# demo-github

This projects demonstrates the integration of GitHub Agent into the Composable as a collection of Agentic Workflows.

## Prerequisites

* You need to have access to Google Cloud project `dengenlabs` to fetch certificates for connecting to Temporal Cloud.
* You already installed and configured the Google Cloud CLI `gcloud`.

## Quickstart

```sh
# install internal packages
gcloud auth login
pnpm install --filter "@dglabs/demo-github-root"
pnpm registry-login
pnpm install

# build workspace
pnpm -r build

# start application
cd apps/github-agent
npn run dev
```

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