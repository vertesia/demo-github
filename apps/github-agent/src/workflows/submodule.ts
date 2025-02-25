import {
    log,
    proxyActivities,
} from "@temporalio/workflow";
import * as activities from "../activities.js";

const {
    createGitBranch,
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

    const msg = request.referralPullRequestUrl ? `Update SDK (${request.referralPullRequestUrl})` : "Update SDK";
    const commitResp = await updateGitSubmodule({
        org: "vertesia",
        repo: "studio",
        sha: refResp.sha,
        path: "composableai",
        submoduleSha: request.commit,
        commitMessage: msg,
    });

    const branchResp = await createGitBranch({
        org: "vertesia",
        repo: "studio",
        sha: commitResp.sha,
        branchName: `dep-${shortCommit}`,
    });

    return {
        ref: branchResp.ref,
        refUrl: branchResp.url,
        // TODO add PR
    };
}
