import { resolveScriptFile, run } from "@dglabs/agent-runner";

const domain = "agents/vertesia/github-agent";
const workflowBundle = await resolveScriptFile("./workflows-bundle.js", import.meta.url);
const activities = await import("./activities.js");

await run({
    workflowBundle,
    activities,
    domain
}).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});
