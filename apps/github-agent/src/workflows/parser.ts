import { GithubIssueRef } from './types.js';

export function parseIssueIdFromBranch({ org, repo, branch }: { org: string, repo: string, branch: string }): GithubIssueRef | undefined {
    const match = branch.match(/^.*(\d+).*$/);
    if (match === null) {
        return undefined;
    }
    const number = parseInt(match[1], 10);
    if (isNaN(number)) {
        return undefined;
    }
    return new GithubIssueRef(org, repo, number);
}

export function parseIssueIdsFromComment({ org, repo, comment }: { org: string, repo: string, comment: string }): Record<string, GithubIssueRef> {
    // key: html URL, value: issue reference
    const issues: Record<string, GithubIssueRef> = {};

    // Match issue references like "#123 #456"
    const anchorMatch = comment.match(/#(\d+)/g);
    if (anchorMatch !== null) {
        anchorMatch.map(m => parseInt(m.substring(1), 10))
            .forEach(id => {
                const ref = new GithubIssueRef(org, repo, id);
                issues[ref.toHtmlUrl()] = ref;
            });
    }

    // Match issue references like
    // "https://github.com/owner/repo/issues/123"
    const urlMatch = comment.match(/https:\/\/github.com\/(.+)\/(.+)\/issues\/(\d+)/g);
    if (urlMatch !== null) {
        urlMatch.map(m => {
            const parts = m.split('/');
            const owner = parts[parts.length - 4];
            const repo = parts[parts.length - 3];
            const number = parseInt(parts[parts.length - 1], 10);
            return new GithubIssueRef(owner, repo, number);
        }).forEach(ref => {
            issues[ref.toHtmlUrl()] = ref;
        });
    }

    return issues;
}

export function parseIssuesFromPullRequest({ org, repo, branch, body }: { org: string, repo: string, branch: string, body: string }): GithubIssueRef[] {
    const issues = parseIssueIdsFromComment({ org, repo, comment: body });
    const issue = parseIssueIdFromBranch({ org, repo, branch });
    if (issue !== undefined) {
        issues[issue.toHtmlUrl()] = issue;
    }

    return Object.values(issues);
}