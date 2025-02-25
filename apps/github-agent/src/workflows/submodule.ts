import {
    log,
    proxyActivities,
} from "@temporalio/workflow";
import * as activities from "../activities.js";

export type UpdateSdkSubmoduleRequest = {
    /**
     * The commit SHA to update the submodule to.
     */
    commit: string;

    /**
     * The title of the pull request.
     */
    pullRequstTitle?: string;

    /**
     * The description of the pull request.
     */
    pullRequestDescription?: string;
};

const {
    createGitBranch,
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

    const resp = await createGitBranch({
        org: "vertesia",
        repo: "studio",
        baseBranch: "main",
        newBranch: `dep-${shortCommit}`,
    })

    return {
        ref: resp.ref,
        number: 1253,
        link: "https://github.com/vertesia/studio/pull/1253",
    };
}
