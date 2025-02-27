export function parseIssueIdFromBranch(name: string): [number | undefined, Error | undefined] {
    const match = name.match(/^.*(\d+).*$/);
    if (match === null) {
        return [undefined, new Error(`Could not parse issue id from branch "${name}".`)];
    }
    try {
        const issueId = parseInt(match[1], 10);
        return [issueId, undefined];
    } catch (e: any) {
        return [undefined, e];
    }
}

export function parseIssueIdFromComment(comment: string): [number | undefined, Error | undefined] {
    // Extract issue id from comment, examples:
    //  - "This is a comment #123" -> 123
    //  - "This is a comment #123 some more text" -> 123
    const anchorMatch = comment.match(/^.* #(\d+)(| .*)$/);
    if (anchorMatch !== null) {
        try {
            const issueId = parseInt(anchorMatch[1], 10);
            return [issueId, undefined];
        } catch (e: any) {
            // Fall through to the next case
        }
    }

    const urlMatch = comment.match(/https:\/\/github.com\/.*\/issues\/(\d+)/);
    if (urlMatch !== null) {
        try {
            const issueId = parseInt(urlMatch[1], 10);
            return [issueId, undefined];
        } catch (e: any) {
            // Fall through to the next case
        }
    }

    return [undefined, new Error(`Could not parse issue id from comment.`)];
}