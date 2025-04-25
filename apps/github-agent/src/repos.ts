export type RepoSpec = {
    supportMultipleFeatures: boolean;
    supportCodeReview: boolean;
    supportDeploymentSummary: boolean;
    supportDiffSummary: boolean;
    supportPurpose: boolean;
    codeStructure: string | undefined;
}

const codeStructureStudio = `\
The Git repository is a pnpm workspace, organized in the following ways:

- All the applications are stored under the directory "./apps/<app>", such as "./apps/studio-server"
  for the Studio Server.
- All the packages are stored under the directory "./packages/<pkg>", such as "./packages/cloud".
- The public documentation is a node.js application stored under the directory "./apps/docs".
- All the infrastructure changes are stored either under the directory "./infrastructure" or "./gcp".
- Reactik is a custom library developed internally, where the source code is stored under the
  directory "./reactik", mainly used by the Studio UI (path "./app/composable-ui")
- The file "./composableai" is a Git reference to the Git submodule composableai, which contains
  the SDK and tools in a public Git repository.
`;

const codeStructureDemoGithub = `\
The Git repository is a pnpm workspace, organized in the following ways:

- The applications are stored under the directory "./apps/<app>", such as "./apps/github-agent".
- The internal documentation is stored under the directory "./docs".
`;

const repoFeatures: Record<string, RepoSpec> = {
    'vertesia/composableai': {
        supportMultipleFeatures: true,
        supportCodeReview: true,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
        supportPurpose: true,
        codeStructure: undefined,
    },
    'vertesia/demo-github': {
        supportMultipleFeatures: true,
        supportCodeReview: true,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
        supportPurpose: true,
        codeStructure: codeStructureDemoGithub,
    },
    'vertesia/llumiverse': {
        supportMultipleFeatures: true,
        supportCodeReview: true,
        supportDeploymentSummary: true,
        supportDiffSummary: true,
        supportPurpose: true,
        codeStructure: undefined,
    },
    'vertesia/memory': {
        supportMultipleFeatures: true,
        supportCodeReview: true,
        supportDeploymentSummary: true,
        supportDiffSummary: true,
        supportPurpose: true,
        codeStructure: undefined,
    },
    'vertesia/studio': {
        supportMultipleFeatures: true,
        supportCodeReview: true,
        supportDeploymentSummary: true,
        supportDiffSummary: true,
        supportPurpose: true,
        codeStructure: codeStructureStudio,
    },
};

export function getRepoFeatures(owner: string, repo: string): RepoSpec {
    const fullName = `${owner}/${repo}`;
    if (!repoFeatures[fullName]) {
        return {
            supportMultipleFeatures: false,
            supportCodeReview: false,
            supportDeploymentSummary: false,
            supportDiffSummary: false,
            supportPurpose: false,
            codeStructure: undefined,
        };
    }
    return repoFeatures[fullName];
}

export function isAgentEnabled(owner: string, repo: string): boolean {
    return repoFeatures[`${owner}/${repo}`] !== undefined;
}
