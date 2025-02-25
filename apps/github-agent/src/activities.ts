import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { log } from "@temporalio/activity";
import { VertesiaClient } from "@vertesia/client";
import { VertesiaGithubApp } from "./activities/github.js";
import {
    VertesiaReviewFilePatchRequest,
    VertesiaReviewFilePatchResponse,
    VertesiaSummarizeCodeDiffRequest,
    VertesiaSummarizeCodeDiffResponse,
} from './activities/vertesia.js';
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
    isBreakdownEnabled?: boolean,
}
export type GeneratePullRequestSummaryResponse = {
    summary: string,
    breakdown?: string,
}
export async function generatePullRequestSummary(request: GeneratePullRequestSummaryRequest): Promise<GeneratePullRequestSummaryResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const diffResp = await app.getPullRequestDiff(request.owner, request.repo, request.pullRequestNumber);
    let diff = diffResp.data as unknown as string;
    log.info(`Got diff for pull request ${request.owner}/${request.repo}/${request.pullRequestNumber}: ${diff.length} characters`);

    const vertesiaRequest = {
        code_diff: diff,
        code_structure: getRepoFeatures(request.owner, request.repo).codeStructure,
    };

    const vertesiaClient = await createVertesiaClient();
    let summary;
    let breakdown;

    if (request.isBreakdownEnabled) {
        const execResp = await vertesiaClient.interactions.executeByName<
            VertesiaSummarizeCodeDiffRequest,
            VertesiaSummarizeCodeDiffResponse
        >(
            'GithubSummarizeCodeDiff@3',
            { data: vertesiaRequest },
        );
        log.info("Got summary from Vertesia", { respose: execResp });
        summary = execResp.result.summary;

        breakdown = "Here is a breakdown of the changes:\n\n";
        breakdown += `Path | Description\n`;
        breakdown += `---- | -----------\n`;
        for (let change of execResp.result.changes) {
            const id = '`' + change.path_or_glob + '`';
            breakdown += `${id} | ${change.description}\n`;
        }
    } else {
        const execResp = await vertesiaClient.interactions.executeByName<
            any,
            string
        >(
            'GithubSummarizeCodeDiff@2',
            { data: vertesiaRequest },
        );
        log.info("Got summary from Vertesia", { respose: execResp });
        summary = execResp.result;
    }

    if (summary.length > 5000) {
        log.warn("Summary is too long, truncating", { length: summary.length });
        summary = summary.substring(0, 5000) + "...";
    }

    return {
        summary: summary,
        breakdown: breakdown,
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

export type PullRequestReviewComment = {
    filePath: string,
    body: string,
    line?: number,
    side?: string,
    start_line?: number,
    start_side?: string,
    position?: number,
}

export type ReviewPullRequestPatchRequest = {
    /**
     * The file path of the file being reviewed. This is a relative path from the root of the
     * repository.
     */
    filePath: string,
    /**
     * The patch applied to the file, extracted from the git-diff.
     */
    filePatch: string,
}
export type ReviewPullRequestPatchResponse = {
    status: string,
    comments: PullRequestReviewComment[],
}
export async function reviewPullRequestPatch(request: ReviewPullRequestPatchRequest): Promise<ReviewPullRequestPatchResponse> {
    const vertesiaClient = await createVertesiaClient();
    const params: VertesiaReviewFilePatchRequest = {
        file_patch: request.filePatch,
        file_path: request.filePath,
    };
    const execResp = await vertesiaClient.interactions.executeByName<
        VertesiaReviewFilePatchRequest,
        VertesiaReviewFilePatchResponse
    >(
        'GithubReviewFilePatch@1',
        { data: params },
    );

    const comments: PullRequestReviewComment[] = execResp.result.comments.map((c) => {
        return {
            filePath: request.filePath,
            body: c.body,
            line: c.line,
            side: c.side,
            start_line: c.start_line,
            start_side: c.start_side,
        };
    });

    return {
        status: "success",
        comments: comments,
    };
}

export type CreatePullRequestReviewRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
    comments: PullRequestReviewComment[],
    body?: string,
}
export type CreatePullRequestReviewResponse = {
    status: string,
    reason: string,
}
export async function createPullRequestReview(request: CreatePullRequestReviewRequest): Promise<CreatePullRequestReviewResponse> {
    const app = await VertesiaGithubApp.getInstance();
    const octokit = await app.getRestClient();
    const resp = await octokit.rest.pulls.createReview({
        owner: request.org,
        repo: request.repo,
        pull_number: request.pullRequestNumber,
        body: request.body,
        event: "COMMENT", // Agent doesn't have permission to approve or request changes.
        comments: request.comments.map((c) => {
            return {
                path: c.filePath,
                body: c.body,
                line: c.line,
                position: c.position,
                side: c.side,
                start_line: c.start_line,
                start_side: c.start_side,
            };
        }),
    });

    log.info(`Pull request review created: ${resp.data.html_url}`, { response: resp });
    return {
        status: "success",
        reason: `Pull request review created: ${resp.data.html_url}`,
    }
}

export type CreateGitBranchRequest = {
    org: string,
    repo: string,
    baseBranch: string,
    newBranch: string,
}
export type CreateGitBranchResponse = {
    status: string,
    ref: string,
    sha: string,
}
export async function createGitBranch(request: CreateGitBranchRequest): Promise<CreateGitBranchResponse> {
    log.info(`Creating new branch ${request.newBranch} from the base branch ${request.baseBranch} in ${request.org}/${request.repo}`);
    const app = await VertesiaGithubApp.getInstance();
    const octokit = await app.getRestClient();

    const getResp = await octokit.rest.git.getRef({
        owner: request.org,
        repo: request.repo,
        ref: `heads/${request.baseBranch}`,
    });
    const createResp = await octokit.rest.git.createRef({
        owner: request.org,
        repo: request.repo,
        sha: getResp.data.object.sha,
        ref: `refs/heads/${request.newBranch}`,
    });

    log.info(`Branch created: ${createResp.data.ref} (${getResp.data.object.sha})`, { response: createResp });
    return {
        status: "success",
        ref: createResp.data.ref,
        sha: createResp.data.object.sha,
    }
}

export type UpdateGitSubmoduleRequest = {
    org: string,
    repo: string,
    branch: string,
    path: string,
    submoduleSha: string,
    commitMessage: string,
}
export type UpdateGitSubmoduleResponse = {
}
export async function updateGitSubmodule(request: UpdateGitSubmoduleRequest): Promise<UpdateGitSubmoduleResponse> {
    log.info(`Updating submodule ${request.org}/${request.repo} to ${request.submoduleSha}`);
    const app = await VertesiaGithubApp.getInstance();
    const octokit = await app.getRestClient();

    const treeResp = await octokit.rest.git.createTree({
        owner: request.org,
        repo: request.repo,
        base_tree: request.branch,
        tree: [
            {
                "path": request.path,
                "mode": "160000",
                "type": "commit",
                "sha": request.submoduleSha,
            }
        ],
    });

    const commitResp = await octokit.rest.git.createCommit({
        owner: request.org,
        repo: request.repo,
        message: request.commitMessage,
        tree: treeResp.data.sha,
    });

    log.info(`Submodule updated: ${commitResp.data.sha}`, { response: commitResp });
    return {};
}

async function createVertesiaClient(): Promise<VertesiaClient> {
    const vault = createSecretProvider(SupportedCloudEnvironments.gcp)
    const apiKey = await vault.getSecret('release-notes-api-key');

    return new VertesiaClient({
        apikey: apiKey,
        serverUrl: 'https://studio-server-preview.api.vertesia.io',
        storeUrl: 'https://zeno-server-preview.api.vertesia.io',
    });
}