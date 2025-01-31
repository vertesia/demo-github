import { BaseLogger, configure } from "@dglabs/logger";
// import Env from "./env.js";
// import { getWebContext } from "./web-context.js";
// import datadog from "dd-trace";

// function mixin(obj: any) {
    // const webContext = getWebContext();
    // const span = datadog.tracer.scope().active();
    // const spanContext = span ? { 'dd.trace_id': span.context().toTraceId(), 'dd.span_id' : span.context().toSpanId() } : {};

    // return webContext ? {
    //     ...obj,
    //     'studio': webContext.studio.logContext,
    //     ...(span ? spanContext : {}),
    // } : obj || undefined;
// }

const logger: BaseLogger = configure({
    level: "info", //Env.logLevel as LogLevel,
    name: "github-server",
    type: "staging", //Env.type,
    version: "0.0.0", //Env.version,
    datadog: undefined, //Env.datadog,
    // cloud: "gcp", //Env.cloud.name,
});

export { logger };
