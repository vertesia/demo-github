import {
    defineSignal,
    log,
    proxyActivities,
    setHandler,
    condition,
} from "@temporalio/workflow";
import * as activities from "./activities.js";

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
    log.info("Entering reviewPullRequest workflow:", request);
    let prEvent = request.githubEvent;
    const prBranch = prEvent.pull_request.head.ref;
    let commentEvent = undefined;

    // Register the signal handler
    setHandler(updatePullRequestSignal, async (data: ReviewPullRequestRequest) => {
        log.info('Signal received with data:', data);
        if (data.githubEventType === 'pull_request') {
            prEvent = data.githubEvent;
        } else if (data.githubEventType === 'issue_comment') {
            commentEvent = data.githubEvent;
            await handleCommentEvent(commentEvent, prBranch);
        } else {
            // backward compatibility
            prEvent = data.githubEvent;
        }
    });

    let comment = undefined;
    let skipReason = undefined;
    if (prEvent.pull_request.user.login === 'mincong-h' && prEvent.repository.full_name === 'vertesia/demo-github') {
        comment = 'Hello from Temporal Workflow!';
    } else if (prEvent.pull_request.user.login === 'mincong-h' && prEvent.repository.full_name === 'vertesia/studio') {
        const spec = computeDeploymentSpec(prBranch);
        if (spec) {
            comment = toGithubComment(spec);
        } else {
            skipReason = 'this branch is not a dev branch.';
        }
    } else {
        skipReason = 'this PR is not part of the test.';
    }

    if (comment) {
        await commentOnPullRequest({
            org: prEvent.repository.owner.login,
            repo: prEvent.repository.name,
            pullRequestNumber: Number(prEvent.pull_request.number),
            message: comment,
        });
    } else {
        log.debug(`Comment is skipped for this pull request: ${skipReason}`);
    }

    await condition(() => prEvent.pull_request.state === 'closed' || prEvent.pull_request.merged);

    if (prEvent.pull_request.merged) {
        log.info(`Pull request is merged (state: ${prEvent.pull_request.state}, merged: ${prEvent.pull_request.merged})`);
    } else {
        log.info(`Pull request is closed (state: ${prEvent.pull_request.state}, merged: ${prEvent.pull_request.merged})`);
    }
    return {};
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

function toGithubComment(spec: DeploymentSpec): string {
    const envCode = '`' + spec.environment + '`';
    const deployedClouds = spec.aws ? "GCP and AWS" : "GCP";
    const specJson = '```json\n' + JSON.stringify(spec, null, 2) + '\n```';
    let vercel = '';
    if (spec.vercel) {
        vercel = ` The Studio UI is available at <${spec.vercel.studioUiUrl}>.`;
    }

    return `Your dev environment ${envCode} will be deployed to ${deployedClouds}.${vercel}

<details><summary><b>Click here</b> to learn more about your environment.</summary>

${specJson}
</details>
`;
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

    const isDevBranch = branch.startsWith('demo') || branch.includes('feature') || branch.includes('fix');
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

async function handleCommentEvent(event: any, prBranch: string) {
    if (event.comment.user.login !== 'vercel[bot]') {
        log.debug('Skip comment event from user:', event.comment.user.login);
        return;
    }

    const url = extractStudioUiUrl(event.comment.body);
    if (!url) {
        log.warn('Failed to extract Studio UI URL from comment:', { comment: event.comment.body });
        return;
    }
    log.debug(`Extracted Studio UI URL: ${url}`);
    const spec = computeDeploymentSpec(prBranch);
    if (spec) {
        spec.vercel = {
            studioUiUrl: url,
        }
        const comment = toGithubComment(spec);
        await commentOnPullRequest({
            org: event.repository.owner.login,
            repo: event.repository.name,
            pullRequestNumber: Number(event.pull_request.number),
            message: comment,
        });
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