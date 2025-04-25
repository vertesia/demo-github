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
        isPurposeEnabled: true,
    },
    'bstefanescu': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
    },
    'ebarroca': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
    },
    'gspradlin': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
    },
    'LeonRuggiero': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
    },
    'loopingz': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
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
        isPurposeEnabled: true,
    },
    'yangchi-tw': {
        isCodeReviewEnabled: true,
        isDeploymentSummaryEnabled: true,
        isDiffSummaryEnabled: true,
        isDiffSummaryBreakdownEnabled: true,
        isPurposeEnabled: true,
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
        return {
            isCodeReviewEnabled: true,
            isDeploymentSummaryEnabled: true,
            isDiffSummaryEnabled: true,
            isDiffSummaryBreakdownEnabled: true,
            isPurposeEnabled: true,
        };
    }
    return enabledUsers[opts.userId];
}

export function isCodeReviewEnabledForFile(filepath: string): boolean {
    return supportedExtensions.some((ext) => filepath.endsWith(ext));
}
