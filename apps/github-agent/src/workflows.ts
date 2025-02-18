import {
    condition,
    defineSignal,
    log,
    proxyActivities,
    setHandler,
    workflowInfo,
} from "@temporalio/workflow";
import * as activities from "./activities.js";
import { isAssistantEnabled } from "./flags.js";

const {
    helloActivity,
    commentOnPullRequest,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minute",
    retry: {
        initialInterval: '5s',
        backoffCoefficient: 2,
        maximumAttempts: 5,
        maximumInterval: 100 * 30 * 1000, //ms
        nonRetryableErrorTypes: [],
    },
});

export async function helloWorkflow() {
    log.info("Entering Hello workflow");
    await helloActivity();
}

/* ----------
 Pull Request Review Workflow
 ---------- */

export const updatePullRequestSignal = defineSignal<[ReviewPullRequestRequest]>('updatePullRequest');
export type ReviewPullRequestRequest = {
    /**
     * The type of event that triggered this workflow in the GitHub API. This is part of the header
     * "x-github-event" of the webhook.
     */
    githubEventType: string | undefined;
    /**
     * The event that triggered this workflow in the GitHub API.
     *
     * See https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request
     */
    githubEvent: any;
}
export type ReviewPullRequestResponse = {
}
export async function reviewPullRequest(request: ReviewPullRequestRequest): Promise<ReviewPullRequestResponse> {
    log.info("Entering reviewPullRequest workflow", { request });
    let prEvent = request.githubEvent;
    let commentEvent = undefined;
    const ctx: PullRequestContext = {
        org: prEvent.repository.owner.login,
        repo: prEvent.repository.name,
        number: Number(prEvent.pull_request.number),
        branch: prEvent.pull_request.head.ref,
        diffUrl: prEvent.pull_request.diff_url,
        commentId: undefined,
    };

    // Register the signal handler
    setHandler(updatePullRequestSignal, async (data: ReviewPullRequestRequest) => {
        log.info('Signal updatePullRequestSignal received', { request: data, pull_request_ctx: ctx });
        if (data.githubEventType === 'pull_request') {
            prEvent = data.githubEvent;
        } else if (data.githubEventType === 'issue_comment') {
            commentEvent = data.githubEvent;
            await handleCommentEvent(ctx, commentEvent);
        } else {
            // backward compatibility
            prEvent = data.githubEvent;
        }
    });

    let comment = undefined;
    let skipReason = undefined;
    let isEnabled = isAssistantEnabled({
        repoFullName: prEvent.repository.full_name,
        userId: prEvent.pull_request.user.login,
    });
    if (isEnabled) {
        const assistantCtx = computeAssistantContext(ctx);
        if (assistantCtx.deployment) {
            comment = toGithubComment(assistantCtx);
        } else {
            skipReason = 'this branch is not a dev branch.';
        }
    } else {
        skipReason = 'this PR is not part of the test.';
    }

    if (comment) {
        const resp = await commentOnPullRequest({
            org: prEvent.repository.owner.login,
            repo: prEvent.repository.name,
            pullRequestNumber: Number(prEvent.pull_request.number),
            message: comment,
            commentId: ctx.commentId,
        });
        ctx.commentId = resp.commentId;
    } else {
        log.info(`Comment is skipped for this pull request: ${skipReason}`, { pull_request_ctx: ctx });
    }

    await condition(() => prEvent.pull_request.state === 'closed' || prEvent.pull_request.merged);

    const status = prEvent.pull_request.merged ? 'merged' : 'closed';
    log.info(`Pull request is ${status} (state: ${prEvent.pull_request.state}, merged: ${prEvent.pull_request.merged})`, { pull_request_ctx: ctx });
    return {};
}

type AssistantContext = {
    /**
     * The deployment specification of the development environment.
     *
     * Undefined if this is not a dev branch.
     */
    deployment: DeploymentSpec | undefined;
    /**
     * The Temporal workflow execution information of the AI assistant.
     */
    execution: TemporalExecution;
    /**
     * The pull request context.
     */
    pullRequest: PullRequestContext;
}

type PullRequestContext = {
    org: string;
    repo: string;
    number: number;
    branch: string;
    diffUrl: string;
    commentId: number | undefined;
}

type DeploymentSpec = {
    environment: string;
    gcp: GcpDeploymentSpec;
    aws: AwsDeploymentSpec | undefined;
    temporal: TemporalDeploymentSpec;
    vercel: VercelDeploymentSpec | undefined;
}

type GcpDeploymentSpec = {
    cloudRunStudioServerName: string;
    cloudRunZenoServerName: string;
    kubeClusterName: string;
    kubeNamespace: string;
    kubeDeployment: string;
    studioApiBaseUrl: string;
    zenoApiBaseUrl: string;
}

type AwsDeploymentSpec = {
    appRunnerStudioServerName: string;
    appRunnerZenoServerName: string;
    studioApiBaseUrl: string;
    zenoApiBaseUrl: string;
}

type TemporalDeploymentSpec = {
    namespace: string;
    zenoTaskQueue: string;
    httpUrl: string;
}

type VercelDeploymentSpec = {
    studioUiUrl: string;
}

type TemporalExecution = {
    namespace: string;
    service: string;
    taskQueue: string;
    workflowType: string;
    workflowId: string;
    runId: string;
}

function toGithubComment(ctx: AssistantContext): string {
    // We assume that the deployment spec is always defined for dev branches.
    const spec = ctx.deployment!;

    const envCode = '`' + spec.environment + '`';
    const deployedClouds = spec.aws ? "GCP and AWS" : "GCP";
    const contextJson = '```json\n' + JSON.stringify(ctx, null, 2) + '\n```';
    let vercel = '';
    if (spec.vercel) {
        vercel = ` The Studio UI is available at <${spec.vercel.studioUiUrl}>.`;
    }

    return `Your dev environment ${envCode} will be deployed to ${deployedClouds}.${vercel}

<details><summary><b>Click here</b> to learn more about your environment.</summary>

${contextJson}
</details>
`;
}

function computeAssistantContext(pullRequestCtx: PullRequestContext): AssistantContext {
    const deployment = computeDeploymentSpec(pullRequestCtx.branch);
    const info = workflowInfo();
    return {
        deployment: deployment!,
        execution: {
            namespace: info.namespace,
            service: 'vertesia_github-agent',
            taskQueue: info.taskQueue,
            workflowId: info.workflowId,
            workflowType: info.workflowType,
            runId: info.runId,
        },
        pullRequest: pullRequestCtx,
    }
}

/**
 * Compute the deployment spec based on the git ref. Assumes the Git repository is "vertesia/studio".
 *
 * @param branch the branch name, e.g., "fix-123"
 * @returns an optional deployment spec
 */
function computeDeploymentSpec(branch: string): DeploymentSpec | undefined {
    if (branch === 'main' || branch === 'preview') {
        const env = branch === 'main' ? 'staging' : 'preview';
        return {
            environment: env,
            gcp: {
                cloudRunStudioServerName: `studio-server-${env}`,
                cloudRunZenoServerName: `zeno-server-${env}`,
                kubeClusterName: 'composable-workers',
                kubeNamespace: 'default',
                kubeDeployment: `${env}-workers`,
                studioApiBaseUrl: `https://studio-server-${env}.api.vertesia.io`,
                zenoApiBaseUrl: `https://zeno-server-${env}.api.vertesia.io`,
            },
            aws: {
                appRunnerStudioServerName: `studio-server-${env}`,
                appRunnerZenoServerName: `zeno-server-${env}`,
                studioApiBaseUrl: `https://studio-server-${env}.aws.api.vertesia.io`,
                zenoApiBaseUrl: `https://zeno-server-${env}.aws.api.vertesia.io`,
            },
            temporal: {
                namespace: `${env}.i16ci`,
                zenoTaskQueue: 'zeno-content',
                httpUrl: `https://cloud.temporal.io/namespaces/${env}.i16ci/workflows`,
            },
            vercel: undefined,
        };
    }

    const isDevBranch = branch.startsWith('demo') || branch.includes('feat') || branch.includes('fix');
    if (!isDevBranch) {
        return undefined;
    }

    const env = 'dev-' + branch.replace(/[^a-zA-Z0-9]/g, '-');
    let spec: DeploymentSpec = {
        environment: env,
        gcp: {
            cloudRunStudioServerName: `studio-server-${env}`,
            cloudRunZenoServerName: `zeno-server-${env}`,
            kubeClusterName: 'workers-dev',
            kubeNamespace: 'default',
            kubeDeployment: `${env}-workers`,
            studioApiBaseUrl: `https://studio-server-${env}.api.vertesia.io`,
            zenoApiBaseUrl: `https://zeno-server-${env}.api.vertesia.io`,
        },
        temporal: {
            namespace: `dev.i16ci`,
            zenoTaskQueue: 'zeno-content',
            httpUrl: `https://cloud.temporal.io/namespaces/dev.i16ci/workflows`,
        },
        aws: undefined,
        vercel: undefined,
    }
    if (branch.includes('aws')) {
        spec.aws = {
            appRunnerStudioServerName: `studio-server-${env}`,
            appRunnerZenoServerName: `zeno-server-${env}`,
            studioApiBaseUrl: `https://studio-server-${env}.aws.api.vertesia.io`,
            zenoApiBaseUrl: `https://zeno-server-${env}.aws.api.vertesia.io`,
        };
    }
    return spec;
}

async function handleCommentEvent(ctx: PullRequestContext, event: any) {
    log.info('Handling comment event', { event, pull_request_ctx: ctx });
    if (event.comment.user.login !== 'vercel[bot]') {
        log.info(`Skip comment event from user: ${event.comment.user.login}`, { pull_request_ctx: ctx });
        return;
    }

    const url = extractStudioUiUrl(event.comment.body);
    if (!url) {
        log.warn('Failed to extract Studio UI URL from comment:', {
            comment: event.comment.body,
            pull_request_ctx: ctx,
        });
        return;
    }
    log.info(`Extracted Studio UI URL: ${url}`);
    const assistantCtx = computeAssistantContext(ctx);
    if (assistantCtx.deployment) {
        assistantCtx.deployment.vercel = {
            studioUiUrl: url,
        }
        const comment = toGithubComment(assistantCtx);
        await commentOnPullRequest({
            org: event.repository.owner.login,
            repo: event.repository.name,
            pullRequestNumber: ctx.number,
            message: comment,
            commentId: ctx.commentId,
        });
    } else {
        log.warn(`Failed to compute deployment spec from branch: ${ctx.branch}`, { pull_request_ctx: ctx });
    }
}

export function extractStudioUiUrl(content: string): string | null {
    const rows = content.split('\n');
    for (const row of rows) {
        // note: "unified"  is the name of the Studio UI in Vercel
        if (row.includes('| **unified**')) {
            const urlMatch = row.match(/\[Visit Preview\]\((https?:\/\/[^)]+)\)/);
            if (urlMatch) {
                return urlMatch[1];
            }
        }
    }
    return null;
}