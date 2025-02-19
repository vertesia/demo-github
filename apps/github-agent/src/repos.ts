export type RepoFeatures = {
    supportMultipleFeatures: boolean;
    supportDeploymentSummary: boolean;
    supportDiffSummary: boolean;
}

const repoFeatures: Record<string, RepoFeatures> = {
    'vertesia/composableai': {
        supportMultipleFeatures: false,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
    },
    'vertesia/demo-github': {
        supportMultipleFeatures: false,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
    },
    'vertesia/llumiverse': {
        supportMultipleFeatures: false,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
    },
    'vertesia/memory': {
        supportMultipleFeatures: false,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
    },
    'vertesia/studio': {
        supportMultipleFeatures: true,
        supportDeploymentSummary: true,
        supportDiffSummary: true,
    },
};

export function getRepoFeatures(owner: string, repo: string): RepoFeatures {
    const fullName = `${owner}/${repo}`;
    if (!repoFeatures[fullName]) {
        return {
            supportDeploymentSummary: false,
            supportDiffSummary: false,
        };
    }
    return repoFeatures[fullName];
}
