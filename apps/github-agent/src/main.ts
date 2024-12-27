import { run, WorkerRunOptions, resolveScriptFile } from "@dglabs/agent-runner";

const options: WorkerRunOptions = {};
// options.activities = await import('@dglabs/github-agent/activities')
options.workflowBundle = await resolveScriptFile("@dglabs/github-agent/workflows/workflows-bundle", import.meta.url)

await run(options).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});
