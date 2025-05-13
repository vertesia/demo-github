import { log } from "@temporalio/activity";
import { UploadContentObjectPayload } from "@vertesia/client";
import { ContentObjectStatus } from '@vertesia/common';
import { VertesiaGithubApp } from "./activities/github.js";
import { HunkSet } from './activities/patch.js';
import {
    ContentTypes,
    createVertesiaClient,
    VertesiaStore_ChangeEntry,
} from './activities/vertesia.js';

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
    const app = await VertesiaGithubApp.getInstance(request.org);
    const client = await app.getRestClient();
    const id = `${request.org}/${request.repo}/${request.pullRequestNumber}`;
    if (request.commentId) {
        log.info(`Updating comment on pull request: ${id}`, { request });
        const response = await client.rest.issues.updateComment({
            owner: request.org,
            repo: request.repo,
            comment_id: request.commentId,
            body: request.message,
        });
        log.info(`Comment ${request.commentId} updated on pull request ${id}`, { request, response });
        return {
            commentId: request.commentId,
        };
    } else {
        log.info(`Creating comment on pull request: ${id}`, { request });
        const response = await client.rest.issues.createComment({
            owner: request.org,
            repo: request.repo,
            issue_number: request.pullRequestNumber,
            body: request.message,
        });
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
    guideline?: string,
}
export type GeneratePullRequestSummaryResponse = {
    summary: string,
    breakdown?: string,
}
export async function generatePullRequestSummary(request: GeneratePullRequestSummaryRequest): Promise<GeneratePullRequestSummaryResponse> {
    const app = await VertesiaGithubApp.getInstance(request.owner);
    const diffResp = await app.getPullRequestDiff(request.owner, request.repo, request.pullRequestNumber);
    let diff = diffResp.data as unknown as string;
    log.info(`Got diff for pull request ${request.owner}/${request.repo}/${request.pullRequestNumber}: ${diff.length} characters`);

    const vertesiaClient = await createVertesiaClient();
    let summary;
    let breakdown;

    const resp = await vertesiaClient.summarizeCodeDiff({
        code_diff: diff,
        guideline: request.guideline,
    });
    log.info("Got summary from Vertesia", { respose: resp });
    summary = resp.summary;

    breakdown = "Here is a breakdown of the changes:\n\n";
    breakdown += `Path | Description\n`;
    breakdown += `---- | -----------\n`;
    for (let change of resp.changes ?? []) {
        const id = '`' + change.path_or_glob + '`';
        breakdown += `${id} | ${change.description}\n`;
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

export type GeneratePullRequestPurposeRequest = {
    org: string,
    repo: string,
    number: number,
    pullRequestDescription: string,
    issueDescriptions: string[],
}
export type GeneratePullRequestPurposeResponse = {
    motivation: string,
    context: string,
    clearness: number, // 1-5
}
export async function generatePullRequestPurpose(request: GeneratePullRequestPurposeRequest): Promise<GeneratePullRequestPurposeResponse> {
    const vertesiaRequest = {
        pull_request: request.pullRequestDescription,
        issues: request.issueDescriptions,
    };
    log.info("Determining pull request purpose", { request: vertesiaRequest });
    const vertesiaClient = await createVertesiaClient();
    const resp = await vertesiaClient.determinePullRequestPurpose(vertesiaRequest);
    log.info("Got purpose response from Vertesia", { respose: resp });

    return {
        motivation: resp.motivation,
        context: resp.context,
        clearness: resp.clearness,
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
    const app = await VertesiaGithubApp.getInstance(request.org);
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
    startLine?: number,
    startSide?: string,

    /**
     * Whether the comment is applicable to a specific line.
     *
     * This is an internal check before submitting the code review comments to GitHub.
     */
    applicable: boolean,
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
    /**
     * @deprecated since 2025-02-27, use `pullRequestPurpose` instead
     */
    pullRequestDescription?: string,
    /**
     * The purpose of the pull request, including the motivation and the context.
     */
    pullRequestPurpose?: string,
}
export type ReviewPullRequestPatchResponse = {
    status: string,
    comments: PullRequestReviewComment[],
}
export async function reviewPullRequestPatch(request: ReviewPullRequestPatchRequest): Promise<ReviewPullRequestPatchResponse> {
    const vertesiaClient = await createVertesiaClient();
    const hunks = HunkSet.parse(request.filePatch);
    const resp = await vertesiaClient.reviewFilePatch({
        file_patch: request.filePatch,
        file_path: request.filePath,
        pull_request_purpose: request.pullRequestPurpose,
    });

    const comments: PullRequestReviewComment[] = resp.comments.map((c) => {
        const comment: PullRequestReviewComment = {
            filePath: request.filePath,
            body: c.body,
            line: c.line,
            side: c.side,
            startLine: c.start_line,
            startSide: c.start_side,
            applicable: false,
        };

        // validation
        if (c.line) {
            comment.applicable = hunks.isLineValid(c.side, c.line);
        }
        if (c.start_line) {
            comment.applicable = hunks.isLineValid(c.start_side, c.start_line);
        }

        if (!comment.applicable) {
            log.warn("Comment may not be applicable to the diff", { comment: c });
        }

        return comment;
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
    htmlUrl?: string,
}
export async function createPullRequestReview(request: CreatePullRequestReviewRequest): Promise<CreatePullRequestReviewResponse> {
    const app = await VertesiaGithubApp.getInstance(request.org);
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
                side: c.side,
                start_line: c.startLine,
                start_side: c.startSide,
            };
        }),
    });

    log.info(`Pull request review created: ${resp.data.html_url}`, { response: resp });
    return {
        status: "success",
        reason: `Pull request review created: ${resp.data.html_url}`,
        htmlUrl: resp.data.html_url,
    }
}

export type GetGitRefRequest = {
    org: string,
    repo: string,
    ref: string,
}
export type GetGitRefResponse = {
    sha: string,
    url: string,
}
export async function getGitRef(request: GetGitRefRequest): Promise<GetGitRefResponse> {
    log.info(`Getting Git reference ${request.ref} in ${request.org}/${request.repo}`);
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    const resp = await octokit.rest.git.getRef({
        owner: request.org,
        repo: request.repo,
        ref: request.ref,
    });

    log.info(`Ref ${request.ref} has SHA ${resp.data.object.sha}`, { response: resp });
    return {
        sha: resp.data.object.sha,
        url: resp.data.object.url,
    }
}

export type CreateGitBranchRequest = {
    /**
     * The organization name.
     *
     * @example "vertesia"
     */
    org: string,

    /**
     * The repository name.
     *
     * @example "studio"
     */
    repo: string,

    /**
     * The start point of the new branch.
     */
    sha: string,

    /**
     * The name of the new branch.
     */
    branchName: string,
}
export type CreateGitBranchResponse = {
    ref: string,
    sha: string,
    url: string,
}
export async function createGitBranch(request: CreateGitBranchRequest): Promise<CreateGitBranchResponse> {
    log.info(`Creating new branch ${request.branchName} from commit ${request.sha} in ${request.org}/${request.repo}`);
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    const createResp = await octokit.rest.git.createRef({
        owner: request.org,
        repo: request.repo,
        sha: request.sha,
        ref: `refs/heads/${request.branchName}`,
    });

    log.info(`Branch created: ${createResp.data.ref} (${request.sha})`, { response: createResp });
    return {
        ref: createResp.data.ref,
        url: `https://github.com/${request.org}/${request.repo}/tree/${request.branchName}`,
        sha: createResp.data.object.sha,
    }
}

export type UpdateGitSubmoduleRequest = {
    /**
     * The organization name.
     *
     * @example "vertesia"
     */
    org: string,

    /**
     * The repository name.
     *
     * @example "studio"
     */
    repo: string,

    /**
     * The commit SHA1 based on which the tree should be created. It is the parent of the new tree
     * and new commit.
     *
     * @example "a3ea9d4a9b5e437f20285b5151c9babca12f50e0"
     */
    sha: string,

    /**
     * The path to the submodule.
     *
     * @example "composableai"
     */
    path: string,

    /**
     * The commit SHA1 of the submodule.
     *
     * @example "74e06523646661b052f19a2a79dfc20d9eca3e60"
     */
    submoduleSha: string,

    /**
     * The message for the new commit.
     */
    commitMessage: string,
}
export type UpdateGitSubmoduleResponse = {
    sha: string,
    url: string,
}
export async function updateGitSubmodule(request: UpdateGitSubmoduleRequest): Promise<UpdateGitSubmoduleResponse> {
    log.info(`Updating submodule ${request.org}/${request.repo} to ${request.submoduleSha}`);
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    const treeResp = await octokit.rest.git.createTree({
        owner: request.org,
        repo: request.repo,
        base_tree: request.sha,
        tree: [
            {
                "path": request.path,
                "mode": "160000",
                "type": "commit",
                "sha": request.submoduleSha,
            }
        ],
    });

    log.info(`Tree created: ${treeResp.data.sha}`, { response: treeResp });

    const commitResp = await octokit.rest.git.createCommit({
        owner: request.org,
        repo: request.repo,
        message: request.commitMessage,
        tree: treeResp.data.sha,
        parents: [request.sha],
    });

    log.info(`Commit created: ${commitResp.data.sha}`, { response: commitResp });
    return {
        sha: commitResp.data.sha,
        url: commitResp.data.url,
    };
}

export type CreatePullRequestRequest = {
    org: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body: string,
    draft?: boolean,
}
export type CreatePullRequestResponse = {
    number: number,
    url: string,
}
export async function createPullRequest(request: CreatePullRequestRequest): Promise<CreatePullRequestResponse> {
    log.info(`Creating pull request in ${request.org}/${request.repo}`, { request: request });
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    const resp = await octokit.rest.pulls.create({
        owner: request.org,
        repo: request.repo,
        title: request.title,
        head: request.head,
        base: request.base,
        body: request.body,
        draft: request.draft,
    });

    return {
        number: resp.data.number,
        url: resp.data.html_url,
    }
}

export type AddAssigneesToPullRequestRequest = {
    org: string,
    repo: string,
    pullRequestNumber: number,
    assignees: string[],
}
export type AddAssigneesToPullRequestResponse = {
}
export async function addAssigneesToPullRequest(request: AddAssigneesToPullRequestRequest): Promise<AddAssigneesToPullRequestResponse> {
    log.info(`Assigning users to pull request ${request.org}/${request.repo}/pull/${request.pullRequestNumber}`, { request: request });
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    await octokit.rest.issues.addAssignees({
        owner: request.org,
        repo: request.repo,
        issue_number: request.pullRequestNumber,
        assignees: request.assignees,
    });

    return {};
}

export type GetGithubIssueRequest = {
    org: string,
    repo: string,
    number: number,
}
export type GetGithubIssueResponse = {
    org: string,
    repo: string,
    number: number,
    title: string,
    body: string,
}
export async function getGithubIssue(request: GetGithubIssueRequest): Promise<GetGithubIssueResponse> {
    log.info(`Getting issue ${request.org}/${request.repo}/issue/${request.number}`);
    const app = await VertesiaGithubApp.getInstance(request.org);
    const octokit = await app.getRestClient();

    const resp = await octokit.rest.issues.get({
        owner: request.org,
        repo: request.repo,
        issue_number: request.number,
    });

    return {
        org: request.org,
        repo: request.repo,
        number: request.number,
        title: resp.data.title,
        body: resp.data.body ?? "",
    }
}

export type GetGuidelineRequest = {
    owner: string,
    repo: string,
    ref: string,
}
export type GetGuidelineResponse = {
    content: string,
    error?: string,
}
export async function getGuideline(request: GetGuidelineRequest): Promise<GetGuidelineResponse> {
    log.info(`Getting guideline for ${request.owner}/${request.repo} at ${request.ref}`);
    const app = await VertesiaGithubApp.getInstance(request.owner);
    const octokit = await app.getRestClient();
    const filenames = [
        "VERTESIA.md",
        "CLAUDE.md",
        "knowledge.md",
    ];

    for (const filename of filenames) {
        try {
            const resp = await octokit.rest.repos.getContent({
                owner: request.owner,
                repo: request.repo,
                path: filename,
                ref: request.ref,
            });

            if (!Array.isArray(resp.data) && resp.data.type === "file") {
                const contentBase64 = resp.data.content;
                const encoding = resp.data.encoding;

                if (contentBase64 && encoding === "base64") {
                    const decoded = Buffer.from(contentBase64, "base64").toString("utf-8");
                    log.info(`Got guideline (${filename})`, { content: decoded });
                    return { content: decoded };
                } else {
                    log.error("Unexpected encoding or empty content.");
                    return { content: "", error: "Unexpected encoding or empty content." };
                }
            } else {
                log.error("The response was not a file.");
                return { content: "", error: "The response was not a file." };
            }

        } catch (error: any) {
            log.warn(`Error getting guideline with ${filename}: ${error.message}. Continuing to the next file`, { error });
            // Continue to next file
        }
    }

    return { content: "", error: "Error getting guideline: All fallback files failed." };
}

export type VertesiaCreateChangeEntryRequest = {
    pullRequest: {
        htmlUrl: string,
        owner: string,
        repository: string,
        number: number,
        repositoryFullName: string,
    },
    commit: {
        sha: string,
        date: string,
        dateInSecond: number,
    },
    author: {
        userId: string,
        date: string,
        dateInSecond: number,
    },
    title: string,
    description: string,
    tags: string[],
}
export type VertesiaCreateChangeEntryResponse = {
    changeEntryId: string,
    changeEntryUrl: string,
}
export async function createChangeEntry(request: VertesiaCreateChangeEntryRequest): Promise<VertesiaCreateChangeEntryResponse> {
    const client = (await createVertesiaClient()).baseClient;
    const props: VertesiaStore_ChangeEntry = {
        pull_request: {
            number: request.pullRequest.number,
            html_url: request.pullRequest.htmlUrl,
            owner: request.pullRequest.owner,
            repository: request.pullRequest.repository,
            repository_full_name: request.pullRequest.repositoryFullName,
        },
        author: {
            user_id: request.author.userId,
            date: request.author.date,
        },
    };

    const payload: UploadContentObjectPayload = {
        type: ContentTypes.ChangeEntry,
        name: request.title,
        text: request.description,
        location: `${request.pullRequest.repositoryFullName}/changes/${request.pullRequest.number}`,
        properties: { ...props },
        tags: request.tags,
    };
    const creationResponse = await client.objects.create(payload);

    // We don't use the "Standard Document Intake" for processing the object because we don't
    // any blobs to be created. We just use the metadata of the object. So we mark the object
    // as completed.
    await client.store.objects.update(creationResponse.id, {
        status: ContentObjectStatus.completed,
    });

    return {
        changeEntryId: creationResponse.id,
        changeEntryUrl: `https://preview.cloud.vertesia.io/store/objects/${creationResponse.id}`,
    };
}
