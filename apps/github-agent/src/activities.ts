import { log } from "@temporalio/activity";
import { VertesiaGithubApp } from "./github.js";

export async function helloActivity() {
    log.info("Hello, World!");
}

export type CommentOnPullRequestRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
    message: string,
    commentId: number | undefined,
}
export type CommentOnPullRequestResponse = {
    commentId: number,
}
export async function commentOnPullRequest(request: CommentOnPullRequestRequest): Promise<CommentOnPullRequestResponse> {
    log.debug("Setting up GitHub App client");
    const app = await VertesiaGithubApp.getInstance();
    const id = `${request.org}/${request.repo}/${request.pullRequestNumber}`;
    if (request.commentId) {
        log.info(`Updating comment on pull request: ${id}`, { request });
        const response = await app.updateComment(
            request.org,
            request.repo,
            request.commentId,
            request.message,
        );
        log.info(`Comment ${request.commentId} updated on pull request ${id}`, { request, response });
        return {
            commentId: request.commentId,
        };
    } else {
        log.info(`Creating comment on pull request: ${id}`, { request });
        const response = await app.createComment(
            request.org,
            request.repo,
            request.pullRequestNumber,
            request.message,
        );
        log.info(`Comment ${response.data.id} created on pull request ${id}`, { request, response });
        return {
            commentId: response.data.id,
        };
    }
}

export type GeneratePullRequestSummaryRequest = {
    codeDiffUrl: string,
}
export type GeneratePullRequestSummaryResponse = {
    summary: string,
}
export async function generatePullRequestSummary(request: GeneratePullRequestSummaryRequest): Promise<GeneratePullRequestSummaryResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const token = await app.getToken();
    const response = await fetch(request.codeDiffUrl, {
        headers: {
            Accept: "application/vnd.github.v3.diff",
            Authorization: `Bearer ${token}`,
        }
    });
    if (!response.ok) {
        log.error(`Failed to fetch diff from ${request.codeDiffUrl}: ${response.status} ${response.statusText}`);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    let diff = await response.text();

    // TODO: use LLM to generate a summary

    if (diff.length > 100) {
        log.warn("Diff is too long, truncating", { length: diff.length });
        diff = diff.substring(0, 1000) + "...";
    }
    return {
        summary: diff,
    };
}
