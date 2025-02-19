export type RepoSpec = {
    supportMultipleFeatures: boolean;
    supportDeploymentSummary: boolean;
    supportDiffSummary: boolean;
    codeStructure: string | undefined;
}

const vertesiaStudioCodeStructure = `\
The Git repository is a pnpm workspace, organized in the following ways:

- All the applications are stored under the directory "./app/<app>", such as "./app/studio-server"
  for the Studio Server.
- All the packages are stored under the directory "./packages/<pkg>", such as "./packages/cloud".
- The public documentation is a node.js application stored under the directory "./app/docs".
- All the infrastructure changes are stored either under the directory "./infrastructure" or "./gcp".
- Reactik is a custom library developed internally, where the source code is stored under the
  directory "./reactik", mainly used by the Studio UI (path "./app/composable-ui")
- The file "./composableai" is a Git reference to the Git submodule composableai, which contains
  the SDK and tools in a public Git repository.
`;

const repoFeatures: Record<string, RepoSpec> = {
    'vertesia/demo-github': {
        supportMultipleFeatures: false,
        supportDeploymentSummary: false,
        supportDiffSummary: true,
        codeStructure: undefined,
    },
    'vertesia/studio': {
        supportMultipleFeatures: true,
        supportDeploymentSummary: true,
        supportDiffSummary: true,
        codeStructure: vertesiaStudioCodeStructure,
    },
};

export function getRepoFeatures(owner: string, repo: string): RepoSpec {
    const fullName = `${owner}/${repo}`;
    if (!repoFeatures[fullName]) {
        return {
            supportMultipleFeatures: false,
            supportDeploymentSummary: false,
            supportDiffSummary: false,
            codeStructure: undefined,
        };
    }
    return repoFeatures[fullName];
}

export function isAgentEnabled(owner: string, repo: string): boolean {
    return repoFeatures[`${owner}/${repo}`] !== undefined;
}