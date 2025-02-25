import {
    log,
    proxyActivities,
} from "@temporalio/workflow";
import * as activities from "../activities.js";

const {
    createGitBranch,
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
     * The number of the pull request.
     */
    number?: number;

    /**
     * The link to the pull request.
     */
    link?: string;
};

export async function updateSdkSubmodule(request: UpdateSdkSubmoduleRequest): Promise<UpdateSdkSubmoduleResponse> {
    log.info("Updating submodule", { request });
    const shortCommit = request.commit.slice(0, 7);
    const newBranch = `dep-${shortCommit}`;

    const resp = await createGitBranch({
        org: "vertesia",
        repo: "studio",
        baseBranch: "main",
        newBranch: newBranch,
    });
    const msg = request.referralPullRequestUrl ? `Update SDK (${request.referralPullRequestUrl})` : "Update SDK";

    await updateGitSubmodule({
        org: "vertesia",
        repo: "studio",
        branch: newBranch,
        path: "composableai",
        submoduleSha: request.commit,
        commitMessage: msg,
    });

    return {
        ref: resp.ref,
        number: 1253,
        link: "https://github.com/vertesia/studio/pull/1253",
    };
}
