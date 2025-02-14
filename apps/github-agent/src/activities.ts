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
}
export type CommentOnPullRequestResponse = {
}
export async function commentOnPullRequest(request: CommentOnPullRequestRequest): Promise<CommentOnPullRequestResponse> {
    log.debug("Setting up GitHub App client");
    const app = await VertesiaGithubApp.getInstance();
    const id = `${request.org}/${request.repo}/${request.pullRequestNumber}`;
    log.info(`Commenting on pull request: ${id}`, { request });
    const response = await app.commentOnPullRequest(
        request.org,
        request.repo,
        request.pullRequestNumber,
        request.message,
    );
    log.info(`Commented on pull request ${id}`, { request, response });
    return {};
}
