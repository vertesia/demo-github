export type UserFeatures = {
    isCodeReviewEnabled: boolean;
    isDeploymentSummaryEnabled: boolean;
    isDiffSummaryEnabled: boolean;
    isDiffSummaryBreakdownEnabled: boolean;
    isPurposeEnabled?: boolean;
}

const enabledUsers: Record<string, UserFeatures> = {
    'antoine-regnier': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'bstefanescu': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'ebarroca': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'LeonRuggiero': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'loopingz': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'mincong-h': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
    },
    'royquilor': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
    },
    'yangchi-tw': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: false,
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
