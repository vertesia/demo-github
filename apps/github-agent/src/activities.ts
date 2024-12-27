export type GetRepoInfoRequest = {
    name: string; // e.g. "mincong-h/mincong-h.github.io"
}
export type GetRepoInfoResponse = {
    owner: string;
    repo: string;
    repo_url: string;
    description?: string;
}
export async function getRepoInfo(request: GetRepoInfoRequest): Promise<GetRepoInfoResponse> {
    if (!request.name) {
        throw new Error('Name is required');
    }

    const [owner, repo] = request.name.split('/');
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
            'Accept': 'application/vnd.github+json',
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API failed: ${response.status}`);
    }

    const payload = await response.json();
    console.log('response', payload);

    return {
        owner,
        repo,
        repo_url: payload.html_url,
        description: payload.description,
    } as GetRepoInfoResponse;
}
