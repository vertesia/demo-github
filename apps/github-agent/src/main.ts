import { run, WorkerRunOptions, resolveScriptFile } from "@dglabs/agent-runner";

const activities = await import('./activities')
const workflowBundle = await resolveScriptFile("@dglabs/github-agent/workflows/workflows-bundle", import.meta.url)

const options: WorkerRunOptions = {
    workflowBundle,
    activities,
};

await run(options).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});
