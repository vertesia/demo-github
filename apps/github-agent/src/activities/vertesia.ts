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
import { VertesiaClient as VertesiaBaseClient } from "@vertesia/client";
import { log } from '@temporalio/activity';

/**
 * Request to review a file patch.
 *
 * @see https://preview.cloud.vertesia.io/studio/interactions/67b853cd7941dee93c9b0632?p=654df9de09676ad3b8631dc3&a=652d77895674c387e105948c#params
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
     * @since 2
     * @deprecated since 2025-02-27, use `pull_request_description` instead
     */
    pull_request_description?: string,
    /**
     * @since 6
     */
    pull_request_purpose?: string,
}

/**
 * Response from reviewing a file patch.
 *
 * @see https://preview.cloud.vertesia.io/studio/interactions/67b853cd7941dee93c9b0632?p=654df9de09676ad3b8631dc3&a=652d77895674c387e105948c#params
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
 *
 * @see https://preview.cloud.vertesia.io/studio/interactions/67b847c87941dee93c9b0452?p=654df9de09676ad3b8631dc3&a=652d77895674c387e105948c#params
 */
export type VertesiaSummarizeCodeDiffRequest = {
    code_diff: string,
    code_structure?: string,
}

/**
 * Response from summarizing a code diff.
 *
 * @see https://preview.cloud.vertesia.io/studio/interactions/67b847c87941dee93c9b0452?p=654df9de09676ad3b8631dc3&a=652d77895674c387e105948c#params
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
     * @version 7 Added a JSON example to the prompt to better indicate the expected result.
     * @version 8 Fix incorrect dollor sign ($) in the prompt.
     */
    async reviewFilePatch(request: VertesiaReviewFilePatchRequest): Promise<VertesiaReviewFilePatchResponse> {
        const endpoint = 'GithubReviewFilePatch@8';
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
     * @version 5 Added a JSON example to the prompt to better indicate the expected result.
     */
    async summarizeCodeDiff(request: VertesiaSummarizeCodeDiffRequest): Promise<VertesiaSummarizeCodeDiffResponse> {
        const endpoint = 'GithubSummarizeCodeDiff@5';
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

    async determinePullRequestPurpose(request: VertesiaDeterminePullRequestPurposeRequest): Promise<VertesiaDeterminePullRequestPurposeResponse> {
        const endpoint = 'GithubDeterminePullRequestPurpose@2';
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

    private logResult(executionEndpoint: string, request: any, response: any) {
        log.info(`Executed interaction "${executionEndpoint}"`, {
            request: request,
            response: response,
        });
    }
}


export async function createVertesiaClient(): Promise<VertesiaClient> {
    const vault = createSecretProvider(SupportedCloudEnvironments.gcp)
    const apiKey = await vault.getSecret('release-notes-api-key');

    const client = new VertesiaBaseClient({
        apikey: apiKey,
        serverUrl: 'https://studio-server-preview.api.vertesia.io',
        storeUrl: 'https://zeno-server-preview.api.vertesia.io',
    });

    return new VertesiaClient(client);
}
