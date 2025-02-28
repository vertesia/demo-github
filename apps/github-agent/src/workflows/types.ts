export type GithubIssue = {
    org: string,
    repo: string,
    title: string,
    body: string,
    number: number,
}

export class GithubIssueRef {
    constructor(public org: string, public repo: string, public number: number) { }

    public toHtmlUrl(): string {
        return `https://github.com/${this.org}/${this.repo}/issues/${this.number}`;
    }
}

export type AssistPullRequestWorkflowRequest = {
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

export type AssistPullRequestWorkflowResponse = {
    status: string;
    reason: string | undefined;
}

export type ReviewPullRequestWorkflowRequest = {
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

export type ReviewCodeChangesWorkflowRequest = {
    /**
     * The organization that owns the repository to review.
     *
     * @example "vertesia"
     */
    org: string,

    /**
     * The name of the repository to review.
     *
     * @example "studio"
     */
    repo: string,

    /**
     * The number of the pull request to review.
     *
     * @example 123
     */
    pullRequestNumber: number,

    /**
     * The purpose of this pull request. This is useful for making the review comments more
     * relevant.
     */
    purpose?: string,
}

export type ReviewCodeChangesWorkflowResponse = {
    /**
     * The link to the pull request event.
     *
     * @example "https://github.com/vertesia/studio/pull/1306#pullrequestreview-2650051733"
     */
    htmlUrl?: string;
}
