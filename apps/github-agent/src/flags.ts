export type UserFeatures = {
    isCodeReviewEnabled: boolean;
    isDeploymentSummaryEnabled: boolean;
    isDiffSummaryEnabled: boolean;
}

const enabledUsers: Record<string, UserFeatures> = {
    'antoine-regnier': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
    'mincong-h': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
    'yangchi-tw': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
};

type getUserFlagsOptions = {
    repoFullName: string;
    userId: string;
}
export function getUserFlags(opts: getUserFlagsOptions): UserFeatures | undefined {
    if (!enabledUsers[opts.userId]) {
        return undefined;
    }
    return enabledUsers[opts.userId];
}
