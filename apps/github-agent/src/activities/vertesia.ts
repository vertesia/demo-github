/**
 * @file Types used by Interactions in Vertesia. The naming convention of these variables are:
 *
 *  Vertesia{Interaction}{Type:Request|Response}{SubType?}
 *
 *  where:
 *   - Interaction is the name of the interaction endpoint
 *   - Type is either a "Request" or "Response"
 *   - SubType is an optional suffix to the type, used for a nested structure
 */
import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { log } from '@temporalio/activity';
import {
    UploadContentObjectPayload,
    VertesiaClient as VertesiaBaseClient,
} from "@vertesia/client";

/**
 * Request to review a file patch.
 */
export type VertesiaReviewFilePatchRequest = {
    /**
     * @since 1
     */
    file_path: string,
    /**
     * @since 1
     */
    file_patch: string,
    /**
     * @since 1
     */
    pull_request_purpose?: string,
}

/**
 * Response from reviewing a file patch.
 */
export type VertesiaReviewFilePatchResponse = {
    comments: VertesiaReviewFilePatchResponseComment[]
}

/**
 * Response from reviewing a file patch.
 *
 * @see VertesiaReviewFilePatchResponse
 */
export type VertesiaReviewFilePatchResponseComment = {
    position?: number,
    body: string,
    line?: number,
    side?: string,
    start_line?: number,
    start_side?: string,
}

/**
 * Request to summarize a code diff.
 */
export type VertesiaSummarizeCodeDiffRequest = {
    code_diff: string,
    guideline?: string,
}

/**
 * Response from summarizing a code diff.
 */
export type VertesiaSummarizeCodeDiffResponse = {
    summary: string,
    changes: VertesiaSummarizeCodeDiffResponseChange[],
}

/**
 * A change inside the response from summarizing a code diff.
 *
 * @see VertesiaSummarizeCodeDiffResponse
 */
export type VertesiaSummarizeCodeDiffResponseChange = {
    path_or_glob: string,
    description: string,
}

export type VertesiaDeterminePullRequestPurposeRequest = {
    pull_request: string,
    issues: string[],
}
export type VertesiaDeterminePullRequestPurposeResponse = {
    motivation: string,
    context: string,
    clearness: number, // 1-5
}

export type VertesiaCreateChangeEntryRequest = {
    pullRequest: {
        htmlUrl: string,
        owner: string,
        repository: string,
        number: number,
        repositoryFullName: string,
    },
    commit: {
        sha: string,
        date: string,
        dateInSecond: number,
    },
    author: {
        userId: string,
        date: string,
        dateInSecond: number,
    },
    description: string,
    tags: string[],
}
export type VertesiaCreateChangeEntryResponse = {
    changeEntryId: string,
    changeEntryUrl: string,
}

export class VertesiaClient {
    private client: VertesiaBaseClient;

    constructor(client: VertesiaBaseClient) {
        this.client = client;
    }

    /**
     * Review a file patch and provide comments.
     *
     * @param request the file patch to review
     * @returns a list of review comments for the file patch
     * @version 1 Initial version
     * @version 2 Update environment
     */
    async reviewFilePatch(request: VertesiaReviewFilePatchRequest): Promise<VertesiaReviewFilePatchResponse> {
        const endpoint = 'review_file_patch@2';
        const response = await this.client.interactions.executeByName<
            VertesiaReviewFilePatchRequest,
            VertesiaReviewFilePatchResponse
        >(
            endpoint,
            { data: request },
        );
        this.logResult(endpoint, request, response);
        return response.result;
    }

    /**
     * Sumarize a code diff to a human-readable format.
     *
     * @param request the code diff to summarize
     * @returns the summary of the code changes
     * @version 1 Initial version
     * @version 2 Update environment
     */
    async summarizeCodeDiff(request: VertesiaSummarizeCodeDiffRequest): Promise<VertesiaSummarizeCodeDiffResponse> {
        const endpoint = 'summarize_code_diff@2';
        const response = await this.client.interactions.executeByName<
            VertesiaSummarizeCodeDiffRequest,
            VertesiaSummarizeCodeDiffResponse
        >(
            endpoint,
            { data: request },
        );
        this.logResult(endpoint, request, response);
        return response.result;
    }

    /**
     * Determine the purpose of a pull request.
     *
     * @param request the pull request to analyze
     * @returns the purpose of the pull request
     * @version 1 Initial version
     * @version 2 Update environment
     */
    async determinePullRequestPurpose(request: VertesiaDeterminePullRequestPurposeRequest): Promise<VertesiaDeterminePullRequestPurposeResponse> {
        const endpoint = 'determine_pull_request_purpose@2';
        const response = await this.client.interactions.executeByName<
            VertesiaDeterminePullRequestPurposeRequest,
            VertesiaDeterminePullRequestPurposeResponse
        >(
            endpoint,
            { data: request },
        );
        this.logResult(endpoint, request, response);
        return response.result;
    }

    async createChangeEntry(request: VertesiaCreateChangeEntryRequest): Promise<VertesiaCreateChangeEntryResponse> {
        // TODO: we cannot use the Objects API from Zeno because it does not support creating objects without
        // a file. We need to create a new endpoint for this.
        const payload: UploadContentObjectPayload = {
            type: '6821524ef3aed394f1ec4931', // ChangeEntry
        }
        const resp = await this.client.store.objects.create(payload);

        return {
            changeEntryId: resp.id,
            changeEntryUrl: `https://studio-preview.api.vertesia.io/${resp.id}`,
        };
    }

    private logResult(executionEndpoint: string, request: any, response: any) {
        log.info(`Executed interaction "${executionEndpoint}"`, {
            request: request,
            response: response,
        });
    }
}


export async function createVertesiaClient(): Promise<VertesiaClient> {
    const vault = createSecretProvider(SupportedCloudEnvironments.gcp)
    const apiKey = await vault.getSecret('github-vertesia-agent-vertesia-api-key');

    const client = new VertesiaBaseClient({
        apikey: apiKey,
        serverUrl: 'https://studio-server-preview.api.vertesia.io',
        storeUrl: 'https://zeno-server-preview.api.vertesia.io',
    });

    return new VertesiaClient(client);
}
