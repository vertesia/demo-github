export type UserFeatures = {
    isDeploymentSummaryEnabled: boolean;
    isDiffSummaryEnabled: boolean;
}

const enabledUsers: Record<string, UserFeatures> = {
    'antoine-regnier': {
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: false,
    },
    'mincong-h': {
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
    },
    'yangchi-tw': {
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: false,
    },
};

type getUserFlagsOptions = {
    repoFullName: string;
    userId: string;
}
export function getUserFlags(opts: getUserFlagsOptions): UserFeatures | undefined {
    if (opts.repoFullName !== 'vertesia/studio') {
        return undefined;
    }
    if (!enabledUsers[opts.userId]) {
        return undefined;
    }
    return enabledUsers[opts.userId];
}
