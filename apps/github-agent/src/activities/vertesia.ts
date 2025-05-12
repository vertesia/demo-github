/**
 * @file Types used by Interactions in Vertesia. The naming convention of these variables are:
 *
 *  1. Vertesia{Interaction}{Type:Request|Response}{SubType?}
 *  2. VertesiaStore_{Type}
 *
 *  where for the 1st pattern:
 *   - "Interaction" is the name of the interaction endpoint
 *   - "Type" is either a "Request" or "Response"
 *   - "SubType" is an optional suffix to the type, used for a nested structure
 *
 *  where for the 2nd pattern:
 *   - "Type" is the actual content type in the content store.
 */
import { createSecretProvider, SupportedCloudEnvironments } from '@dglabs/cloud';
import { log } from '@temporalio/activity';
import {
    UploadContentObjectPayload,
    VertesiaClient as VertesiaBaseClient,
} from "@vertesia/client";

enum ContentTypes {
    /**
     * The ID of the content type "ChangeEntry".
     *
     * @see {@linkcode VertesiaStore_ChangeEntry} for the actual schema.
     */
    ChangeEntry = '6821524ef3aed394f1ec4931',
}

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
    title: string,
    description: string,
    tags: string[],
}
export type VertesiaCreateChangeEntryResponse = {
    changeEntryId: string,
    changeEntryUrl: string,
}

export type VertesiaStore_ChangeEntry = {
    /**
     * The pull request related to this change entry.
     *
     * Present if the change entry is submitted via a pull request, else empty.
     */
    pull_request?: {
        /**
         * The pull request number
         *
         * @example 123
         */
        number: number,
        /**
         * The pull request HTML URL.
         *
         * @example https://github.com/vertesia/examples/pull/123
         */
        html_url: string,
        /**
         * The owner of the repository.
         *
         * @example vertesia
         */
        owner: string,
        /**
         * The repository name.
         *
         * @example examples
         */
        repository: string,
        /**
         * The repository full name, including the owner.
         *
         * @example vertesia/examples
         */
        repository_full_name: string,
    }
    author: {
        /**
         * The GitHub user ID of the commiter of this change.
         *
         * @example mincong-h
         */
        user_id: string,
        /**
         * The author date of this change in ISO-8601 string.
         *
         * @example 2025-05-12@17:58:00Z
         */
        date: string,
    },
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
        const props: VertesiaStore_ChangeEntry = {
            pull_request: {
                number: request.pullRequest.number,
                html_url: request.pullRequest.htmlUrl,
                owner: request.pullRequest.owner,
                repository: request.pullRequest.owner,
                repository_full_name: request.pullRequest.repositoryFullName,
            },
            author: {
                user_id: request.author.userId,
                date: request.author.date,
            },
        };
        const payload: UploadContentObjectPayload = {
            type: ContentTypes.ChangeEntry,
            name: request.title,
            text: request.description,
            properties: { ...props },
            tags: request.tags,
        };
        const resp = await this.client.store.objects.create(payload);

        return {
            changeEntryId: resp.id,
            changeEntryUrl: `https://studio-preview.api.vertesia.io/store/objects/${resp.id}`,
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
