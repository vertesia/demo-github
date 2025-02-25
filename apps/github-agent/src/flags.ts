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
        isDiffSummaryBreakdownEnabled: false,
    },
    'bstefanescu': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: false,
    },
    'ebarroca': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: false,
    },
    'LeonRuggiero': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: false,
    },
    'loopingz': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: false,
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
        isDiffSummaryBreakdownEnabled: false,
    },
    'placeholder': {
        isCodeReviewEnabled: false,
        isDeploymentSummaryEnabled: false,
        isDiffSummaryEnabled: false,
        isDiffSummaryBreakdownEnabled: false,
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
