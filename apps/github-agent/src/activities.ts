import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { log } from "@temporalio/activity";
import { VertesiaClient } from "@vertesia/client";
import { VertesiaGithubApp } from "./github.js";
import { getRepoFeatures } from './repos.js';

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
        serverUrl: 'https://studio-server-preview.api.vertesia.io',
        storeUrl: 'https://zeno-server-preview.api.vertesia.io',
    });
    const execResp = await vertesiaClient.interactions.executeByName<any, string>(
        'SummarizeCodeDiff',
        {
            data: {
                code_diff: diff,
                code_structure: getRepoFeatures(request.owner, request.repo).codeStructure,
            }
        },
    );
    log.info("Got summary from Vertesia", { respose: execResp });

    let summary = execResp.result;
    if (summary.length > 5000) {
        log.warn("Summary is too long, truncating", { length: summary.length });
        summary = summary.substring(0, 5000) + "...";
    }
    return {
        summary: summary,
    };
}

export type ListFilesInPullRequestRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
}
export type ListFilesInPullRequestResponseFile = {
    filename: string,
    patch: string,
    status: string,
    additions: number,
    deletions: number,
    changes: number,
}
export type ListFilesInPullRequestResponse = {
    fileCount: number,
    files: ListFilesInPullRequestResponseFile[],
}
export async function listFilesInPullRequest(request: ListFilesInPullRequestRequest): Promise<ListFilesInPullRequestResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const filesResp = await app.listPullRequestFiles(request.org, request.repo, request.pullRequestNumber);
    let files: ListFilesInPullRequestResponseFile[] = filesResp.data.map((f: any) => {
        return {
            filename: f.filename,
            patch: f.patch,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
        };
    });
    log.info(`Got ${files.length} files for pull request ${request.org}/${request.repo}/${request.pullRequestNumber}`, { files: filesResp.data });

    return {
        fileCount: files.length,
        files: files,
    }
}

export type ReviewPatchRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
    filename: string,
    patch: string,
    commit: string,
}
export type ReviewPatchResponse = {
    status: string,
    reason: string,
}
export async function reviewPatch(request: ReviewPatchRequest): Promise<ReviewPatchResponse> {
    // note: this is a test for understanding the GitHu API
    if (request.filename !== "docs/test.md") {
        return {
            status: "skipped",
            reason: "Unsupported file",
        };
    }
    const app = await VertesiaGithubApp.getInstance();
    const octokit = await app.getRestClient();
    await octokit.rest.pulls.createReviewComment({
        owner: request.org,
        repo: request.repo,
        pull_number: request.pullRequestNumber,
        body: "This is a test review comment.",
        path: request.filename,
        line: 1,
        commit_id: request.commit,
    });
    return {
        status: "success",
        reason: "Comment created",
    };
}

export type CreatePullRequestReviewRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
    comments: CreatePullRequestReviewRequestComment[],
}
export type CreatePullRequestReviewRequestComment = {
    filename: string,
    patch: string,
    body: string,
    line: number,
}
export type CreatePullRequestReviewResponse = {
    status: string,
    reason: string,
}
export async function createPullRequestReview(request: CreatePullRequestReviewRequest): Promise<CreatePullRequestReviewResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const octokit = await app.getRestClient();
    await octokit.rest.pulls.createReview({
        owner: request.org,
        repo: request.repo,
        pull_number: request.pullRequestNumber,
        body: "This is a test review comment.",
        event: "APPROVE",
        comments: request.comments.map((c) => {
            return {
                path: c.filename,
                line: c.line,
                body: c.body,
            };
        }),
    });
    return {
        status: "success",
        reason: "Test done.",
    }
}

async function getVertesiaApiKey() {
    const vault = createSecretProvider(process.env.CLOUD as SupportedCloudEnvironments ?? SupportedCloudEnvironments.gcp)
    return await vault.getSecret('release-notes-api-key');
}
