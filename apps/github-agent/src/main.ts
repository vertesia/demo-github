import { run, WorkerRunOptions, resolveScriptFile } from "@dglabs/agent-runner";

// options.activities = await import('@dglabs/github-agent/activities')
const workflowBundle = await resolveScriptFile("@dglabs/github-agent/workflows/workflows-bundle", import.meta.url)

const options: WorkerRunOptions = {
    workflowBundle,
};

await run(options).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});
