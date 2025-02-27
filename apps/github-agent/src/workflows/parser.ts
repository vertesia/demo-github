export function parseIssueIdFromBranch(name: string): number | undefined {
    const match = name.match(/^.*(\d+).*$/);
    if (match === null) {
        return undefined;
    }
    return parseInt(match[1], 10);
}

export function parseIssueIdsFromComment(comment: string): number[] {
    const issuesIds: number[] = [];

    // Match issue references like "#123 #456"
    const anchorMatch = comment.match(/#(\d+)/g);
    if (anchorMatch !== null) {
        anchorMatch.map(m => parseInt(m.substring(1), 10))
            .forEach(id => issuesIds.push(id));
    }

    // Match issue references like
    // "https://github.com/owner/repo/issues/123"
    const urlMatch = comment.match(/https:\/\/github.com\/.*\/issues\/(\d+)/g);
    if (urlMatch !== null) {
        urlMatch.map(m => parseInt(m.split('/').pop()!, 10))
            .forEach(id => issuesIds.push(id));
    }

    return issuesIds;
}

export function parseIssueIdsFromPullRequest({ branch, body }: { branch: string, body: string }): number[] {
    const issueIds = parseIssueIdsFromComment(body);
    const refId = parseIssueIdFromBranch(branch);
    if (refId !== undefined) {
        issueIds.push(refId);
    }

    return Array.from(new Set(issueIds)).sort();
}