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
    let event = request.githubEvent;

    // Register the signal handler
    setHandler(updatePullRequestSignal, (data: ReviewPullRequestRequest) => {
        log.info('Signal received with data:', data);
        event = data.githubEvent;
    });

    let comment = undefined;
    let skipReason = undefined;
    if (event.pull_request.user.login === 'mincong-h' && event.repository.full_name === 'vertesia/demo-github') {
        comment = 'Hello from Temporal Workflow!';
    } else if (event.pull_request.user.login === 'mincong-h' && event.repository.full_name === 'vertesia/studio') {
        const spec = computeDeploymentSpec(event.pull_request.head.ref);
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
            org: event.repository.owner.login,
            repo: event.repository.name,
            pullRequestNumber: Number(event.pull_request.number),
            message: comment,
        });
    } else {
        log.debug(`Comment is skipped for this pull request: ${skipReason}`);
    }

    await condition(() => event.pull_request.state === 'closed' || event.pull_request.merged);

    if (event.pull_request.merged) {
        log.info(`Pull request is merged (state: ${event.pull_request.state}, merged: ${event.pull_request.merged})`);
    } else {
        log.info(`Pull request is closed (state: ${event.pull_request.state}, merged: ${event.pull_request.merged})`);
    }
    return {};
}

type DeploymentSpec = {
    environment: string;
    gcp?: GcpDeploymentSpec;
    aws?: AwsDeploymentSpec;
    temporal?: TemporalDeploymentSpec;
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
}

function toGithubComment(spec: DeploymentSpec): string {
    const envCode = '`' + spec.environment + '`';
    const deployedClouds = spec.aws ? "GCP and AWS" : "GCP";
    const content = '```json' + JSON.stringify(spec, null, 2) + '```';

    return `Your dev environment ${envCode} is deployed to ${deployedClouds}. Expand the details section below to see additional information.

<details><summary><b>Click here</b> to learn more about your environment.</summary>

${content}
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
                kubeDeployment: `studio-server-${env}`,
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
            }
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
            kubeClusterName: 'composable-workers',
            kubeNamespace: 'default',
            kubeDeployment: `studio-server-${env}`,
            studioApiBaseUrl: `https://studio-server-${env}.api.vertesia.io`,
            zenoApiBaseUrl: `https://zeno-server-${env}.api.vertesia.io`,
        },
        temporal: {
            namespace: `dev.i16ci`,
            zenoTaskQueue: 'zeno-content',
        },
        aws: undefined,
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
