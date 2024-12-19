import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { getRepoInfo } = proxyActivities<typeof activities>({
    startToCloseTimeout: '1m',
});

export type GetMultiRepoInfoRequest = {
    names: string[];
}
export type GetMultiRepoInfoResponse = {
    count: number;
    repos: activities.GetRepoInfoResponse[];
}

/**
 * Get the information of a list of Git repositories.
 *
 * @param names a list of repository names to fetch, separated by comma.
 *   For example, "mincong-h/mincong-h.github.io, mincong-h/learning-node"
 * @returns a list of descriptions, one per repository.
 */
export async function getRepos(request: GetMultiRepoInfoRequest): Promise<GetMultiRepoInfoResponse> {
    const responses = await Promise.all(request.names.map((name) => getRepoInfo({name})));

    return {
        count: responses.length,
        repos: responses,
    } as GetMultiRepoInfoResponse;
}
