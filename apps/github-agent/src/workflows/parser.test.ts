import { expect, test } from 'vitest';
import {
    parseIssueIdFromBranch,
    parseIssueIdsFromComment,
} from './parser';
import { GithubIssueRef } from './types.js';

test('Parse issue ID from Git branch', async () => {
    expect(parseIssueIdFromBranch({
        org: 'vertesia',
        repo: 'studio',
        branch: 'feat/123/my-feature',
    })).toEqual(new GithubIssueRef('vertesia', 'studio', 123));

    expect(parseIssueIdFromBranch({
        org: 'vertesia',
        repo: 'studio',
        branch: 'feat-123',
    })).toEqual(new GithubIssueRef('vertesia', 'studio', 123));
});

test('Parse issue ID from comment', async () => {
    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: `\
## Description

- #123
`
    })).toEqual({
        "https://github.com/vertesia/studio/issues/123": {
            org: 'vertesia',
            repo: 'studio',
            number: 123,
        },
    });

    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: 'This is a test',
    })).toEqual({});

    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: `\
## Description

- https://github.com/vertesia/composableai/issues/123
`}
    )).toEqual({
        "https://github.com/vertesia/composableai/issues/123": {
            org: 'vertesia',
            repo: 'composableai',
            number: 123,
        },
    });
});
