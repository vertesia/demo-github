// import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { Endpoints } from '@octokit/types';
import { App as OctoApp, Octokit } from 'octokit';

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
    // const vault = createSecretProvider(process.env.CLOUD as SupportedCloudEnvironments ?? SupportedCloudEnvironments.gcp)
    // return await vault.getSecret('github-vertesia-agent-code-review');
    return "";
}


export class VertesiaGithubApp {
    constructor(public app: OctoApp, public installation: Endpoints["GET /orgs/{org}/installation"]["response"]["data"]) {
    }

    get installationId() {
        return this.installation.id;
    }

    get appId() {
        return this.installation.app_id;
    }

    get clientId() {
        return (this.installation as any).client_id;
    }

    async getRestClient(): Promise<Octokit> {
        const token = await this.app.octokit.rest.apps.createInstallationAccessToken({
            installation_id: this.installationId,
        });
        return new Octokit({
            auth: token.data.token
        });
    }

    async commentOnPullRequest(owner: string, repo: string, pull_number: number, body: string) {
        const octokit = await this.getRestClient();
        return await octokit.rest.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: pull_number,
            body
        });
    }

    static _instance: VertesiaGithubApp | null = null;
    static async create(privateKey: string) {
        const app = new OctoApp({
            appId: GITHUB_CODE_REVIEW_APP_ID,
            privateKey: privateKey,
        });
        const installation = await app.octokit.rest.apps.getOrgInstallation({ org: "vertesia" });
        return new VertesiaGithubApp(app, installation.data);
    }

    static async getInstance() {
        if (!VertesiaGithubApp._instance) {
            const privateKey = await getVertesiaGithubAppKey();
            VertesiaGithubApp._instance = await VertesiaGithubApp.create(privateKey);
        }
        return VertesiaGithubApp._instance;
    }
}
