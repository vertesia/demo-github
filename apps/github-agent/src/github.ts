import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
// import { Endpoints } from '@octokit/types';
// import { App as OctoApp, Octokit } from 'octokit';

/**
 * The app instance: https://github.com/organizations/vertesia/settings/apps/vertesia-code-review
 * The app installation: https://github.com/organizations/vertesia/settings/installations/61005138
 */
export const GITHUB_CODE_REVIEW_APP_ID = "1144331";

/**
 * Get the private key to sign the JWT token
 * @returns
 */
async function getVertesiaGithubAppKey() {
    const vault = createSecretProvider(process.env.CLOUD as SupportedCloudEnvironments ?? SupportedCloudEnvironments.gcp)
    return await vault.getSecret('github-vertesia-agent-code-review');
}


export class VertesiaGithubApp {
    // constructor(public app: OctoApp, public installation: Endpoints["GET /orgs/{org}/installation"]["response"]["data"]) {
    // }
    constructor() {}

//     get installationId() {
//         return this.installation.id;
//     }

//     get appId() {
//         return this.installation.app_id;
//     }

//     get clientId() {
//         return (this.installation as any).client_id;
//     }

//     async getRestClient(): Promise<Octokit> {
//         const token = await this.app.octokit.rest.apps.createInstallationAccessToken({
//             installation_id: this.installationId,
//         });
//         return new Octokit({
//             auth: token.data.token
//         });
//     }

//     async runWorkflow(workflow_id: string, ref: string, inputs?: Record<string, any>) {
//         const octokit = await this.getRestClient();
//         return await octokit.rest.actions.createWorkflowDispatch({
//             owner: "vertesia",
//             repo: "studio",
//             workflow_id,
//             ref,
//             inputs
//         });
//     }

    static _instance: VertesiaGithubApp | null = null;
    static async create(_: string) {
        // const app = new OctoApp({
        //     appId: GITHUB_CODE_REVIEW_APP_ID,
        //     privateKey
        // });
        // const installation = await app.octokit.rest.apps.getOrgInstallation({ org: "vertesia" });
        // return new VertesiaGithubApp(app, installation.data);
        return new VertesiaGithubApp();
    }

    static async getInstance() {
        if (!VertesiaGithubApp._instance) {
            const privateKey = await getVertesiaGithubAppKey();
            VertesiaGithubApp._instance = await VertesiaGithubApp.create(privateKey);
        }
        return VertesiaGithubApp._instance;
    }
}
