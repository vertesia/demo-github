import { log, proxyActivities } from "@temporalio/workflow";
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
    return {};
}
