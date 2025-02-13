import {
    log,
    proxyActivities,
    defineSignal,
    setHandler,
} from "@temporalio/workflow";
import * as activities from "./activities.js";

const {
    helloActivity,
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

    while (event.pull_request.state !== 'closed') {
        log.info('Pull request is still open, waiting for signal');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate waiting
    }

    if (event.pull_request.merged) {
        log.info(`Pull request is merged (state: ${event.pull_request.state}, merged: ${event.pull_request.merged})`);
    } else {
        log.info(`Pull request is closed (state: ${event.pull_request.state}, merged: ${event.pull_request.merged})`);
    }
    return {};
}
