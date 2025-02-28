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
import { ExecutionRun, ExecutionRunStatus } from "@vertesia/common";
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

    async reviewFilePatch(request: VertesiaReviewFilePatchRequest): Promise<VertesiaReviewFilePatchResponse> {
        const resp = await this.client.interactions.executeByName<
            VertesiaReviewFilePatchRequest,
            VertesiaReviewFilePatchResponse
        >(
            'GithubReviewFilePatch@6',
            { data: request },
        );
        return getResult(resp);
    }

    async summarizeCodeDiff(request: VertesiaSummarizeCodeDiffRequest): Promise<VertesiaSummarizeCodeDiffResponse> {
        const resp = await this.client.interactions.executeByName<
            VertesiaSummarizeCodeDiffRequest,
            VertesiaSummarizeCodeDiffResponse
        >(
            'GithubSummarizeCodeDiff@4',
            { data: request },
        );
        return getResult(resp);
    }

    async determinePullRequestPurpose(request: VertesiaDeterminePullRequestPurposeRequest): Promise<VertesiaDeterminePullRequestPurposeResponse> {
        const resp = await this.client.interactions.executeByName<
            VertesiaDeterminePullRequestPurposeRequest,
            VertesiaDeterminePullRequestPurposeResponse
        >(
            'GithubDeterminePullRequestPurpose@2',
            { data: request },
        );
        return getResult(resp);
    }
}

/**
 * Gets the result of an execution run from the Vertesia API.
 *
 * This function is needed because sometimes the result is a stringified JSON object, which
 * requires a manual parsing. On 2025-02-28, we had random failures on the result structure with
 * the model Google Gemini 2.0 Pro.
 *
 * @template R the type of the response data from the Vertesia API
 * @param {R} run the actual response of the execution run from the Vertesia API
 * @returns {R} the result of the execution run
 */
function getResult<R = any>(run: ExecutionRun<any, R>): R {
    if (run.status === ExecutionRunStatus.failed && typeof run.result === 'string') {
        try {
            return JSON.parse(run.result) as R;
        } catch (e) {
            log.error(`Failed to parse response from Vertesia. This should never happen, please investigate.`, { run, error: e });
            throw new Error(`Execution failed with status ${run.status} and result ${run.result}`);
        }
    }
    return run.result;
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
