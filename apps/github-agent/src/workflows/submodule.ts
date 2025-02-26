import {
    log,
    proxyActivities,
} from "@temporalio/workflow";
import * as activities from "../activities.js";

const {
    addAssigneesToPullRequest,
    createGitBranch,
    createPullRequest,
    getGitRef,
    updateGitSubmodule,
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

export type UpdateSdkSubmoduleRequest = {
    /**
     * The commit SHA to update the submodule to.
     */
    commit: string;

    /**
     * The URL to the pull request that triggered the submodule update.
     *
     * @example "https://github.com/vertesia/composableai/pull/113"
     */
    referralPullRequestUrl?: string;

    /**
     * The title of the pull request.
     */
    pullRequstTitle?: string;

    /**
     * The description of the pull request.
     */
    pullRequestDescription?: string;

    /**
     * The user or service that triggered the workflow.
     *
     * It should be the creator of the pull request.
     *
     * @example "mincong-h"
     */
    triggeredBy?: string;

    /**
     * Whether the workflow is running in test mode.
     */
    test?: boolean;
};

export type UpdateSdkSubmoduleResponse = {
    /**
     * The Git reference for updating the submodule.
     */
    ref: string;

    /**
     * The URL to the Git reference.
     */
    refUrl: string;

    /**
     * The number of the pull request.
     */
    pullRequestNumber?: number;

    /**
     * The URL to the pull request.
     */
    pullRequestUrl?: string;
};

export async function updateSdkSubmodule(request: UpdateSdkSubmoduleRequest): Promise<UpdateSdkSubmoduleResponse> {
    log.info("Updating submodule", { request });
    const shortCommit = request.commit.slice(0, 7);

    const refResp = await getGitRef({
        org: "vertesia",
        repo: "studio",
        ref: `heads/main`,
    });

    const commitResp = await updateGitSubmodule({
        org: "vertesia",
        repo: "studio",
        sha: refResp.sha,
        path: "composableai",
        submoduleSha: request.commit,
        // We don't include the PR/issue number in the commit message because we already mentioned
        // it in the pull request.
        commitMessage: "Update SDK",
    });

    const branchResp = await createGitBranch({
        org: "vertesia",
        repo: "studio",
        sha: commitResp.sha,
        branchName: `sdk-${shortCommit}`,
    });

    let body = request.pullRequestDescription;
    if (!body) {
        body = `Update Git submodule composableai to https://github.com/vertesia/composableai/commit/${shortCommit}.`;
        if (request.referralPullRequestUrl) {
            body += ` This is related to:\n\n* ${request.referralPullRequestUrl}\n`;
        }
    }
    const prResp = await createPullRequest({
        org: "vertesia",
        repo: "studio",
        title: request.pullRequstTitle ?? `chore(deps): update composableai to ${shortCommit}`,
        body: body,
        head: branchResp.ref,
        base: "main",
        draft: request.test === true,
    })

    if (request.triggeredBy) {
        try {
            await addAssigneesToPullRequest({
                org: "vertesia",
                repo: "studio",
                pullRequestNumber: prResp.number,
                assignees: [request.triggeredBy],
            });
        } catch (err) {
            // We don't want to fail the workflow if we can't add assignees to the pull request.
            log.error("Failed to add assignees to pull request", { error: err });
        }
    }

    return {
        ref: branchResp.ref,
        refUrl: branchResp.url,
        pullRequestNumber: prResp.number,
        pullRequestUrl: prResp.url,
    };
}
