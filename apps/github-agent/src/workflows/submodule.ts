import { log } from "@temporalio/workflow";

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

    return {
        ref: `refs/heads/dep-${shortCommit}`,
        number: 123,
        link: "https://github.com/vertesia/studio/pull/1253",
    };
}
