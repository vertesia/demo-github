/*
 * This file contains the types that are used in the workflows.
 *
 * For workflow signals, the types are suffixed with "SignalRequest" or "SignalResponse".
 * See https://docs.temporal.io/sending-messages
 */

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

/**
 * The signal to update the pull request context.
 */
export type UpdatePullRequestContextSignalRequest = {
    /**
     * The latest head SHA of the pull request.
     *
     * Empty if this is not part of the update.
     *
     * @since 2025-02-28
     */
    newHeadSha?: string,

    /**
     * The new title of the pull request.
     *
     * Empty if this is not part of the update.
     *
     * @since 2025-02-28
     */
    newTitle?: string,

    /**
     * The new body of the pull request.
     *
     * Empty if this is not part of the update.
     *
     * @since 2025-02-28
     */
    newBody?: string,

    /**
     * The new comment ID.
     *
     * Empty if this is not part of the update.
     *
     * @since 2025-02-28
     */
    newCommentId?: number,
}

export type UpdatePullRequestContextSignalResponse = {}
