import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { log } from "@temporalio/activity";
import { VertesiaClient } from "@vertesia/client";
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
    owner: string,
    repo: string,
    pullRequestNumber: number,
}
export type GeneratePullRequestSummaryResponse = {
    summary: string,
}
export async function generatePullRequestSummary(request: GeneratePullRequestSummaryRequest): Promise<GeneratePullRequestSummaryResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const diffResp = await app.getPullRequestDiff(request.owner, request.repo, request.pullRequestNumber);
    let diff = diffResp.data as unknown as string;
    log.info(`Got diff for pull request ${request.owner}/${request.repo}/${request.pullRequestNumber}: ${diff.length} characters`);

    const apiKey = await getVertesiaApiKey();
    const vertesiaClient = new VertesiaClient({
        apikey: apiKey,
        serverUrl: 'https://studio-server-staging.api.vertesia.io',
        storeUrl: 'https://zeno-server-staging-api.vertesia.io',
    });
    const execResp = await vertesiaClient.interactions.executeByName<any, string>(
        'SummarizeCodeDiff',
        {
            data: {
                code_diff: diff,
            }
        },
    );

    let summary = execResp.result
    if (summary.length > 5000) {
        log.warn("Summary is too long, truncating", { length: summary.length });
        summary = summary.substring(0, 5000) + "...";
    }
    return {
        summary: diff,
    };
}

async function getVertesiaApiKey() {
    const vault = createSecretProvider(process.env.CLOUD as SupportedCloudEnvironments ?? SupportedCloudEnvironments.gcp)
    return await vault.getSecret('release-notes-api-key');
}
