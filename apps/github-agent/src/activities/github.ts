import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { Endpoints } from '@octokit/types';
import { App as OctoApp, Octokit } from 'octokit';

/**
 * The app instance: https://github.com/organizations/vertesia/settings/apps/vertesia-code-review
 * The app installation: https://github.com/organizations/vertesia/settings/installations/65503270
 */
export const GITHUB_CODE_REVIEW_APP_ID = "1234461";

/**
 * Get the private key to sign the JWT token
 * @returns
 */
async function getVertesiaGithubAppKey() {
    const vault = createSecretProvider(process.env.CLOUD as SupportedCloudEnvironments ?? SupportedCloudEnvironments.gcp)
    return await vault.getSecret('github-vertesia-agent-code-review');
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

    async getToken() {
        return await this.app.octokit.rest.apps.createInstallationAccessToken({
            installation_id: this.installationId,
        });
    }

    /**
     * Get a raw diff of a pull request.
     *
     * @see https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#get-a-pull-request
     */
    async getPullRequestDiff(owner: string, repo: string, pull_number: number) {
        const octokit = await this.getRestClient();
        return await octokit.rest.pulls.get({
            owner: owner,
            repo: repo,
            pull_number: pull_number,
            mediaType: {
                format: "diff",
            },
        });
    }

    async listPullRequestFiles(owner: string, repo: string, pull_number: number) {
        const octokit = await this.getRestClient();
        return await octokit.rest.pulls.listFiles({
            owner: owner,
            repo: repo,
            pull_number: pull_number,
        });
    }

    static _privateKey: string | null = null;
    static _instances: Record<string, VertesiaGithubApp> = {};

    static async create(privateKey: string, owner: string) {
        const app = new OctoApp({
            appId: GITHUB_CODE_REVIEW_APP_ID,
            privateKey: privateKey,
        });
        let installation: any;
        try {
            installation = await app.octokit.rest.apps.getOrgInstallation({ org: owner });
        } catch (e) {
            installation = await app.octokit.rest.apps.getUserInstallation({ username: owner });
        }
        return new VertesiaGithubApp(app, installation.data);
    }

    static async getInstance(owner: string) {
        if (!VertesiaGithubApp._privateKey) {
            VertesiaGithubApp._privateKey = await getVertesiaGithubAppKey();
        }
        if (!VertesiaGithubApp._instances[owner]) {
            VertesiaGithubApp._instances[owner] = await VertesiaGithubApp.create(
                VertesiaGithubApp._privateKey,
                owner,
            );
        }
        return VertesiaGithubApp._instances[owner];
    }
}
