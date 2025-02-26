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
     */
    pull_request_description?: string,
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
    codd_diff: string,
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
