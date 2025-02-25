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

export type VertesiaReviewFilePatchRequest = {
    file_path: string,
    file_patch: string,
}
export type VertesiaReviewFilePatchResponseComment = {
    position?: number,
    body: string,
    line?: number,
    side?: string,
    start_line?: number,
    start_side?: string,
}
export type VertesiaReviewFilePatchResponse = {
    comments: VertesiaReviewFilePatchResponseComment[]
}
