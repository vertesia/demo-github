import {
    condition,
    defineSignal,
    log,
    proxyActivities,
    setHandler,
    workflowInfo,
    startChild,
    patched,
} from "@temporalio/workflow";
import * as activities from "../activities.js";
import { PullRequestWorkflowSpec } from "../common/spec.js";
import {
    getUserFlags,
    isCodeReviewEnabledForFile,
    supportedExtensions,
    UserFeatures,
} from "../flags.js";
import { getRepoFeatures, isAgentEnabled } from "../repos.js";
import { parseIssuesFromPullRequest } from "./parser.js";
import {
    GithubIssue,
    AssistPullRequestWorkflowRequest,
    AssistPullRequestWorkflowResponse,
    ReviewPullRequestWorkflowRequest,
    ReviewPullRequestWorkflowResponse,
    ReviewCodeChangesWorkflowRequest,
    ReviewCodeChangesWorkflowResponse,
} from "./types.js";

const {
    // pull request
    commentOnPullRequest,
    generatePullRequestSummary,
    generatePullRequestPurpose,
    listFilesInPullRequest,
    createPullRequestReview,
    reviewPullRequestPatch,
    getGithubIssue,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minute",
    retry: {
        initialInterval: '5s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: 100 * 30 * 1000, //ms
        nonRetryableErrorTypes: [],
    },
});

export const updatePullRequestSignal = defineSignal<[ReviewPullRequestWorkflowRequest]>('updatePullRequest');

/**
 * This is the main workflow for providing assistance to a GitHub pull request.
 *
 * @since 2025-02-28
 */
export async function assistPullRequestWorkflow(request: AssistPullRequestWorkflowRequest): Promise<AssistPullRequestWorkflowResponse> {
    const ctx: AssistantContext = {
        deployment: undefined,
        pullRequest: {
            org: request.org,
            repo: request.repo,
            number: request.pullRequestNumber,
        },
    };

    await condition(() => ctx.pullRequest.state === 'closed' || ctx.pullRequest.merged === true);

    return {
        htmlUrl: `https://github.com/${ctx.pullRequest.org}/${ctx.pullRequest.repo}/pull/${ctx.pullRequest.number}`,
    }
}

/**
 * @deprecated since 2025-02-28, use assistPullRequestWorkflow instead
 */
export async function reviewPullRequest(request: ReviewPullRequestWorkflowRequest): Promise<ReviewPullRequestWorkflowResponse> {
    log.info("Entering reviewPullRequest workflow", { request });
    let prEvent = request.githubEvent;

    if (!isAgentEnabled(prEvent.repository.owner.login, prEvent.repository.name)) {
        log.info(`Skip the pull request for repo: ${prEvent.repository.full_name}`);
        return {
            status: 'skipped',
            reason: 'Agent is disabled for this repo.',
        };
    }

    const userFlags = getUserFlags({
        repoFullName: prEvent.repository.full_name,
        userId: prEvent.pull_request.user.login,
    });
    if (!userFlags) {
        log.info(`Skip the pull request for user: ${prEvent.pull_request.user.login}`);
        return {
            status: 'skipped',
            reason: 'Agent is disabled for this PR.',
        };
    }
    if (prEvent.pull_request.base.ref === 'preview') {
        // We don't support code review for the preview branch because it has too many changes.
        // Also, the commits have been reviewed.
        log.info(`Skip the pull request for branch: ${prEvent.pull_request.base.ref}`);
        return {
            status: 'skipped',
            reason: 'Code review is not available for the preview branch.',
        };
    }

    const ctx = computeAssistantContext(prEvent);
    await handlePullRequestEvent(ctx, prEvent, userFlags);

    // Register the signal handler
    setHandler(updatePullRequestSignal, async (updateReq: ReviewPullRequestWorkflowRequest) => {
        log.info('Signal updatePullRequestSignal received', { request: updateReq, pull_request_ctx: ctx });
        try {
            if (updateReq.githubEventType === 'pull_request') {
                prEvent = updateReq.githubEvent;
                await handlePullRequestEvent(ctx, prEvent, userFlags);
            } else if (updateReq.githubEventType === 'issue_comment') {
                await handleCommentEvent(ctx, updateReq.githubEvent);
            }
        } catch (err) {
            log.error('Failed to handle the signal', { error: err, pull_request_ctx: ctx });
        }
    });

    await condition(() => prEvent.pull_request.state === 'closed' || prEvent.pull_request.merged);

    const status = prEvent.pull_request.merged ? 'merged' : 'closed';
    log.info(`Pull request is ${status} (state: ${prEvent.pull_request.state}, merged: ${prEvent.pull_request.merged})`, { pull_request_ctx: ctx });
    return {
        status: status,
        reason: undefined,
    };
}

export async function reviewCodeChangesWorkflow(request: ReviewCodeChangesWorkflowRequest): Promise<ReviewCodeChangesWorkflowResponse> {
    log.info("Entering reviewCodeChanges workflow", { request });
    const resp = await listFilesInPullRequest({
        org: request.org,
        repo: request.repo,
        pullRequestNumber: request.pullRequestNumber,
    });
    const commentPromises = resp.files
        .filter((file) => isCodeReviewEnabledForFile(file.filename))
        .filter((file) => file.status !== 'removed')
        .map(async (file) => {
            const resp = await reviewPullRequestPatch({
                filePath: file.filename,
                filePatch: file.patch,
                pullRequestPurpose: request.purpose,
            });
            return resp.comments;
        });
    const commentsPerFile = await Promise.all(commentPromises);
    const comments: activities.PullRequestReviewComment[] = commentsPerFile
        .reduce((acc, f) => acc.concat(f), [])
        .filter((c) => c.applicable);
    const body = comments.length == 0
        ? `Currently, the code review only supports the following file extensions: ${supportedExtensions.map(v => '`' + v + '`').join(', ')}.`
        : undefined;

    let postFailure = false;
    let htmlUrl: string | undefined;

    try {
        const resp = await createPullRequestReview({
            org: request.org,
            repo: request.repo,
            pullRequestNumber: request.pullRequestNumber,
            body: body,
            comments: comments,
        });
        htmlUrl = resp.htmlUrl;
    } catch (err) {
        log.error('Failed to create a pull request review. Posting a warning to GitHub',
            { error: err, pull_request_ctx: request },
        );
        postFailure = true;
    }

    if (postFailure) {
        const resp = await createPullRequestReview({
            org: request.org,
            repo: request.repo,
            pullRequestNumber: request.pullRequestNumber,
            body: 'Failed to create a code review. Please check the workflow execution for more details.',
            comments: [],
        });
        htmlUrl = resp.htmlUrl;
    }
    return { htmlUrl: htmlUrl };
}

type AssistantContext = {
    /**
     * The deployment specification of the development environment.
     *
     * Undefined if this is not a dev branch.
     */
    deployment?: DeploymentSpec;
    /**
     * The pull request context.
     */
    pullRequest: PullRequestContext;
    /**
     * The summary of the code difference of the pull request.
     */
    summary?: DiffSummary;
}

type DiffSummary = {
    summary: string;
    breakdown?: string;
}

type PullRequestContext = {
    org: string;
    repo: string;
    number: number;
    branch?: string;
    diffUrl?: string;
    commentId?: number;
    /**
     * This is the latest commit pushed to the pull request.
     */
    commitSha?: string;
    title?: string;
    body?: string;

    relatedIssues?: Record<string, GithubIssue>;

    /**
     * Why the pull request is created.
     */
    motivation?: string;

    /**
     * What problem the pull request is solving.
     */
    context?: string;

    /**
     * How clear the motivation and context are. Score from 1 to 5.
     */
    clearness?: number;

    /**
     * The state of the pull request. It can be "open", "closed", or "merged".
     */
    state?: string;

    /**
     * Whether the pull request is merged.
     */
    merged?: boolean;
}

type DeploymentSpec = {
    environment: string;
    gcp: GcpDeploymentSpec;
    aws: AwsDeploymentSpec | undefined;
    temporal: TemporalDeploymentSpec;
    vercel: VercelDeploymentSpec | undefined;
}

type GcpDeploymentSpec = {
    cloudRunStudioServerName: string;
    cloudRunZenoServerName: string;
    kubeClusterName: string;
    kubeNamespace: string;
    kubeDeployment: string;
    studioApiBaseUrl: string;
    zenoApiBaseUrl: string;
}

type AwsDeploymentSpec = {
    appRunnerStudioServerName: string;
    appRunnerZenoServerName: string;
    studioApiBaseUrl: string;
    zenoApiBaseUrl: string;
}

type TemporalDeploymentSpec = {
    namespace: string;
    zenoTaskQueue: string;
    httpUrl: string;
}

type VercelDeploymentSpec = {
    studioUiUrl: string;
}

function toGithubComment(ctx: AssistantContext): string {
    const repo = getRepoFeatures(ctx.pullRequest.org, ctx.pullRequest.repo);

    // Use headers to distinguish different sections
    const includeHeader = repo.supportMultipleFeatures;

    let comment = '';
    if (repo.supportDiffSummary) {
        comment += toGithubCommentDiffSummary(ctx.summary, includeHeader);
    }
    if (repo.supportPurpose) {
        comment += toGithubCommentPurpose(ctx.pullRequest, includeHeader);
    }
    if (repo.supportDeploymentSummary) {
        comment += toGithubCommentDeployment(ctx.deployment, includeHeader);
    }
    if (repo.supportCodeReview) {
        comment += toGithubCommentCodeReview(ctx.pullRequest);
    }
    return comment.trim();
}

function toGithubCommentDiffSummary(summary: DiffSummary | undefined, includeHeader: boolean): string {
    const optionalHeader = includeHeader ? '## Changes\n\n' : '';
    if (!summary) {
        return `${optionalHeader}_Summary is not available yet._\n\n`;
    }

    let content = `${optionalHeader}${summary.summary}`;
    if (summary.breakdown) {
        content += `\n\n${summary.breakdown}`;
    }
    return content + '\n\n';
}

function toGithubCommentPurpose(pr: PullRequestContext, includeHeader: boolean): string {
    const optionalHeader = includeHeader ? '## Purpose\n\n' : '';
    if (!pr.motivation || !pr.context) {
        return `${optionalHeader}_Purpose is not available yet._`;
    }

    return `${optionalHeader}\n\n${pr.motivation}\n\n${pr.context}\n\n`;
}

function toGithubCommentDeployment(spec: DeploymentSpec | undefined, includeHeader: boolean): string {
    const optionalHeader = includeHeader ? '## Deployment\n\n' : '';
    if (spec) {
        const envCode = '`' + spec.environment + '`';
        const deployedClouds = spec.aws ? "GCP and AWS" : "GCP";
        const specJson = '```json\n' + JSON.stringify(spec, null, 2) + '\n```';
        let optionalVercel = '';
        if (spec.vercel) {
            optionalVercel = ` The Studio UI is available at <${spec.vercel.studioUiUrl}>.`;
        }

        return `${optionalHeader}Your dev environment ${envCode} will be deployed to ${deployedClouds}.${optionalVercel}

<details><summary><b>Click here</b> to learn more about your environment.</summary>

${specJson}
</details>

`;
    } else {
        return `${optionalHeader}Your pull request does not contain a dev environment. To enable a dev environment, please create a branch with the prefix "demo-", or contains keyword "feat" or "fix".\n\n`;
    }
}

function toGithubCommentCodeReview(ctx: PullRequestContext): string {
    let comment = '## Code Review\n\n';
    comment += 'You can start a code review by adding a comment: "Vertesia, please review".\n\n';

    let status: string | undefined;
    let additionalNote: string | undefined;
    if (ctx.clearness !== undefined) {
        switch (ctx.clearness) {
            case 1:
                status = 'very unclear (1/5)';
                additionalNote = 'Note that the motivation and context are rated as ' + status
                    + ', please explain the motivation and describe the problem to clarify the'
                    + ' purpose of the pull request. You can provide information in the pull'
                    + ' request description or link this pull request to a GitHub issue.';
                break;
            case 2:
                status = 'unclear (2/5)';
                additionalNote = 'Note that the motivation and context are rated as ' + status
                    + ', please explain the motivation and describe the problem to clarify the'
                    + ' purpose of the pull request. You can provide information in the pull'
                    + ' request description or link this pull request to a GitHub issue.';
                break;
            case 3:
                status = 'moderate (3/5)';
                additionalNote = 'Note that the motivation and context are rated as ' + status
                    + ', you can improve the motivation and the problem statement to clarify the'
                    + ' purpose of the pull request. You can provide information in the pull'
                    + ' request description or link this pull request to a GitHub issue.';
                break;
            case 4:
                status = 'clear (4/5)';
                additionalNote = 'Note that the motivation and context are rated as ' + status
                    + '. The agent has a good understanding of the purpose of the pull request.';
                break;
            case 5:
                status = 'very clear (5/5)';
                additionalNote = 'Note that the motivation and context are rated as ' + status
                    + '. The agent has a very good understanding of the purpose of the pull request.';
                break;
            default:
                break;
        }
    }
    if (additionalNote) {
        comment += additionalNote + '\n\n';
    }

    return comment;
}

function computeAssistantContext(prEvent: any): AssistantContext {
    const pullRequest = computePullRequestContext(prEvent);
    const repo = getRepoFeatures(pullRequest.org, pullRequest.repo);

    const ctx: AssistantContext = {
        deployment: undefined,
        pullRequest: pullRequest,
    }

    if (repo.supportDeploymentSummary) {
        ctx.deployment = computeDeploymentSpec(prEvent.pull_request.head.ref);
    }

    return ctx;
}

function computePullRequestContext(prEvent: any): PullRequestContext {
    return {
        org: prEvent.repository.owner.login,
        repo: prEvent.repository.name,
        number: Number(prEvent.pull_request.number),
        branch: prEvent.pull_request.head.ref,
        diffUrl: prEvent.pull_request.diff_url,
        commentId: undefined,
        commitSha: prEvent.pull_request.head.sha,
        title: prEvent.pull_request.title ?? "",
        body: prEvent.pull_request.body ?? "",
        relatedIssues: {},
    };
}

/**
 * Compute the deployment spec based on the git ref. Assumes the Git repository is "vertesia/studio".
 *
 * @param branch the branch name, e.g., "fix-123"
 * @returns an optional deployment spec
 */
function computeDeploymentSpec(branch: string): DeploymentSpec | undefined {
    if (branch === 'main' || branch === 'preview') {
        const env = branch === 'main' ? 'staging' : 'preview';
        return {
            environment: env,
            gcp: {
                cloudRunStudioServerName: `studio-server-${env} `,
                cloudRunZenoServerName: `zeno-server-${env} `,
                kubeClusterName: 'composable-workers',
                kubeNamespace: 'default',
                kubeDeployment: `${env} -workers`,
                studioApiBaseUrl: `https://studio-server-${env}.api.vertesia.io`,
                zenoApiBaseUrl: `https://zeno-server-${env}.api.vertesia.io`,
            },
            aws: {
                appRunnerStudioServerName: `studio-server-${env}`,
                appRunnerZenoServerName: `zeno-server-${env}`,
                studioApiBaseUrl: `https://studio-server-${env}.aws.api.vertesia.io`,
                zenoApiBaseUrl: `https://zeno-server-${env}.aws.api.vertesia.io`,
            },
            temporal: {
                namespace: `${env}.i16ci`,
                zenoTaskQueue: 'zeno-content',
                httpUrl: `https://cloud.temporal.io/namespaces/${env}.i16ci/workflows`,
            },
            vercel: undefined,
        };
    }

    const isDevBranch = branch.startsWith('demo') || branch.includes('feat') || branch.includes('fix');
    if (!isDevBranch) {
        return undefined;
    }

    const env = 'dev-' + branch.replace(/[^a-zA-Z0-9]/g, '-');
    let spec: DeploymentSpec = {
        environment: env,
        gcp: {
            cloudRunStudioServerName: `studio-server-${env}`,
            cloudRunZenoServerName: `zeno-server-${env}`,
            kubeClusterName: 'workers-dev',
            kubeNamespace: 'default',
            kubeDeployment: `${env}-workers`,
            studioApiBaseUrl: `https://studio-server-${env}.api.vertesia.io`,
            zenoApiBaseUrl: `https://zeno-server-${env}.api.vertesia.io`,
        },
        temporal: {
            namespace: `dev.i16ci`,
            zenoTaskQueue: 'zeno-content',
            httpUrl: `https://cloud.temporal.io/namespaces/dev.i16ci/workflows`,
        },
        aws: undefined,
        vercel: undefined,
    }
    if (branch.includes('aws')) {
        spec.aws = {
            appRunnerStudioServerName: `studio-server-${env}`,
            appRunnerZenoServerName: `zeno-server-${env}`,
            studioApiBaseUrl: `https://studio-server-${env}.aws.api.vertesia.io`,
            zenoApiBaseUrl: `https://zeno-server-${env}.aws.api.vertesia.io`,
        };
    }
    return spec;
}

async function handlePullRequestEvent(ctx: AssistantContext, prEvent: any, userFlags: UserFeatures) {
    // Only handle the events when the PR is not closed or merged.
    if (prEvent.action === 'closed' || prEvent.pull_request.merged) {
        return;
    }

    log.info(`Handling pull_request event (${prEvent.action})`, { event: prEvent });
    if (userFlags.isDiffSummaryEnabled) {
        const resp = await generatePullRequestSummary({
            owner: ctx.pullRequest.org,
            repo: ctx.pullRequest.repo,
            pullRequestNumber: ctx.pullRequest.number,
            isBreakdownEnabled: userFlags.isDiffSummaryBreakdownEnabled,
        });
        log.info(`Diff summary of the PR: ${resp.summary}`);
        ctx.summary = {
            summary: resp.summary,
            breakdown: resp.breakdown,
        };
    } else {
        log.info('Diff summary is disabled for this user');
    }

    if (userFlags.isPurposeEnabled) {
        await loadGithubIssues(ctx);
    }

    const comment = toGithubComment(ctx);
    const commentId = await upsertComment(ctx.pullRequest, comment);

    // update context
    ctx.pullRequest.commitSha = prEvent.pull_request.head.sha;
    ctx.pullRequest.title = prEvent.pull_request.title ?? "";
    ctx.pullRequest.body = prEvent.pull_request.body ?? "";
    if (!ctx.pullRequest.commentId) {
        ctx.pullRequest.commentId = commentId;
    }
}

async function loadGithubIssues(ctx: AssistantContext) {
    const issueRefs = parseIssuesFromPullRequest({
        org: ctx.pullRequest.org,
        repo: ctx.pullRequest.repo,
        branch: ctx.pullRequest.branch!,
        body: ctx.pullRequest.body!,
    });
    log.info(`Found ${issueRefs.length} GitHub issues in the pull request`, { pull_request_ctx: ctx, issue_refs: issueRefs });

    const alreadyLoaded = ctx.pullRequest.relatedIssues !== undefined && issueRefs.every((ref) => {
        return ctx.pullRequest.relatedIssues![ref.toHtmlUrl()] !== undefined;
    });

    if (alreadyLoaded) {
        log.info('Skip loading GitHub issues because they are already loaded', { pull_request_ctx: ctx });
    } else {
        log.info('Loading GitHub issues', { pull_request_ctx: ctx, issue_refs: issueRefs });
        const issues = await Promise.all(issueRefs.map(async (ref) => {
            return await getGithubIssue({
                org: ref.org,
                repo: ref.repo,
                number: ref.number,
            });
        }));

        ctx.pullRequest.relatedIssues = issues.map((issue) => {
            return {
                org: issue.org,
                repo: issue.repo,
                number: issue.number,
                title: issue.title,
                body: issue.body,
            } as GithubIssue;
        }).reduce((acc, issue) => {
            const url = `https://github.com/${issue.org}/${issue.repo}/issues/${issue.number}`;
            acc[url] = issue;
            return acc;
        }, {} as Record<string, GithubIssue>);

        log.info('Loaded GitHub issues.', { pull_request_ctx: ctx, issues: ctx.pullRequest.relatedIssues });
    }

    log.info('Generating pull request purpose', { pull_request_ctx: ctx });
    const issueDescriptions = Object.values(ctx.pullRequest.relatedIssues)
        .map((issue) => {
            return `${issue.title}\n\n${issue.body}`;
        });
    const prDescription = ctx.pullRequest.title + '\n\n' + ctx.pullRequest.body;
    const resp = await generatePullRequestPurpose({
        org: ctx.pullRequest.org,
        repo: ctx.pullRequest.repo,
        number: ctx.pullRequest.number,
        pullRequestDescription: prDescription,
        issueDescriptions: issueDescriptions,
    });

    // update context
    ctx.pullRequest.motivation = resp.motivation;
    ctx.pullRequest.context = resp.context;
    ctx.pullRequest.clearness = resp.clearness;
}

async function handleCommentEvent(ctx: AssistantContext, commentEvent: any): Promise<void> {
    log.info(`Handling comment event from ${commentEvent.comment.user.login}`, {
        event: commentEvent,
        pull_request_ctx: ctx,
    });

    if (commentEvent.comment.user.login === 'vercel[bot]' && ctx.deployment?.vercel === undefined) {
        return upsertVertesiaComment(ctx, commentEvent);
    }

    const body = commentEvent.comment.body as string;
    if (!commentEvent.comment.user.login.startsWith('vertesia') && body.toLowerCase().includes('vertesia, please review')) {
        // note: we don't want to wait for the code review to finish
        // because code review is an independent process.
        if (patched('use-child-workflow-for-code-review')) {
            const spec = new PullRequestWorkflowSpec(
                ctx.pullRequest.org,
                ctx.pullRequest.repo,
                ctx.pullRequest.number,
            );
            const childHandle = await startChild(reviewCodeChangesWorkflow, {
                args: [{
                    org: ctx.pullRequest.org,
                    repo: ctx.pullRequest.repo,
                    pullRequestNumber: ctx.pullRequest.number,
                    purpose: `${ctx.pullRequest.motivation}\n\n${ctx.pullRequest.context}`,
                }],
                workflowId: spec.codeReviewChildWorkflowId,
            });
            log.info(`Code review started as a child workflow`, {
                childWorkflowId: childHandle.workflowId,
                childWorkflowRunId: childHandle.firstExecutionRunId,
            });
        } else {
            startCodeReview(ctx);
            log.info('Code review started as an activity', { pull_request_ctx: ctx });
        }
        return;
    }

    log.info(`Skip comment event from user: ${commentEvent.comment.user.login}`, { pull_request_ctx: ctx });
}

async function upsertVertesiaComment(ctx: AssistantContext, vercelCommentEvent: any) {
    const repo = getRepoFeatures(ctx.pullRequest.org, ctx.pullRequest.repo);
    if (repo.supportDeploymentSummary) {
        const url = extractStudioUiUrl(vercelCommentEvent.comment.body);
        if (!url) {
            log.warn('Failed to extract Studio UI URL from comment:', {
                comment: vercelCommentEvent.comment.body,
                pull_request_ctx: ctx,
            });
            return;
        }
        log.info(`Extracted Studio UI URL: ${url}`);
        if (ctx.deployment) {
            ctx.deployment.vercel = {
                studioUiUrl: url,
            }
        }
    }

    const comment = toGithubComment(ctx);
    await upsertComment(ctx.pullRequest, comment);
}

async function upsertComment(ctx: PullRequestContext, comment: string): Promise<number> {
    const response = await commentOnPullRequest({
        org: ctx.org,
        repo: ctx.repo,
        pullRequestNumber: ctx.number,
        message: comment,
        commentId: ctx.commentId,
    });
    return response.commentId;
}

export function extractStudioUiUrl(content: string): string | null {
    const rows = content.split('\n');
    for (const row of rows) {
        // note: "unified"  is the name of the Studio UI in Vercel
        if (row.includes('| **unified**')) {
            const urlMatch = row.match(/\[Visit Preview\]\((https?:\/\/[^)]+)\)/);
            if (urlMatch) {
                return urlMatch[1];
            }
        }
    }
    return null;
}

/**
 * @deprecated since 2025-02-28, use reviewCodeChangesWorkflow instead
 *
 * TODO: Remove this function when all the PRs are updated to use reviewCodeChangesWorkflow
 */
async function startCodeReview(ctx: AssistantContext) {
    const resp = await listFilesInPullRequest({
        org: ctx.pullRequest.org,
        repo: ctx.pullRequest.repo,
        pullRequestNumber: ctx.pullRequest.number,
    });
    const commentPromises = resp.files
        .filter((file) => isCodeReviewEnabledForFile(file.filename))
        .filter((file) => file.status !== 'removed')
        .map(async (file) => {
            const resp = await reviewPullRequestPatch({
                filePath: file.filename,
                filePatch: file.patch,
                pullRequestPurpose: `${ctx.pullRequest.motivation}\n\n${ctx.pullRequest.context}`,
            });
            return resp.comments;
        });
    const commentsPerFile = await Promise.all(commentPromises);
    const comments: activities.PullRequestReviewComment[] = commentsPerFile
        .reduce((acc, f) => acc.concat(f), [])
        .filter((c) => c.applicable);
    const body = comments.length == 0
        ? `Currently, the code review only supports the following file extensions: ${supportedExtensions.map(v => '`' + v + '`').join(', ')}.`
        : undefined;

    let postFailure = false;

    try {
        await createPullRequestReview({
            org: ctx.pullRequest.org,
            repo: ctx.pullRequest.repo,
            pullRequestNumber: ctx.pullRequest.number,
            body: body,
            comments: comments,
        });
    } catch (err) {
        log.error('Failed to create a pull request review. Posting a warning to GitHub',
            { error: err, pull_request_ctx: ctx },
        );
        postFailure = true;
    }

    if (postFailure) {
        await createPullRequestReview({
            org: ctx.pullRequest.org,
            repo: ctx.pullRequest.repo,
            pullRequestNumber: ctx.pullRequest.number,
            body: 'Failed to create a code review. Please check the workflow execution for more details.',
            comments: [],
        });
    }
}
