export type UserFeatures = {
    isCodeReviewEnabled: boolean;
    isDeploymentSummaryEnabled: boolean;
    isDiffSummaryEnabled: boolean;
    isDiffSummaryBreakdownEnabled: boolean;
}

const enabledUsers: Record<string, UserFeatures> = {
    'antoine-regnier': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'bstefanescu': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'ebarroca': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'LeonRuggiero': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'loopingz': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'mincong-h': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
    'yangchi-tw': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
    },
};

export const supportedExtensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
];

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

export function isCodeReviewEnabledForFile(filepath: string): boolean {
    return supportedExtensions.some((ext) => filepath.endsWith(ext));
}
