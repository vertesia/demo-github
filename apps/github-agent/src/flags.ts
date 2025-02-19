export type UserFeatures = {
    isDeploymentSummaryEnabled: boolean;
    isDiffSummaryEnabled: boolean;
}

const enabledUsers: Record<string, UserFeatures> = {
    'antoine-regnier': {
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
    'mincong-h': {
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
    'yangchi-tw': {
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
