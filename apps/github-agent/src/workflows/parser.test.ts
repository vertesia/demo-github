import { expect, test } from 'vitest';
import {
    parseIssueIdFromBranch,
    parseIssueIdsFromComment,
} from './parser';

test('Parse issue ID from Git branch', async () => {
    expect(parseIssueIdFromBranch({
        org: 'vertesia',
        repo: 'studio',
        branch: 'feat/123/my-feature',
    })).toEqual({
        org: 'vertesia',
        repo: 'studio',
        number: 123,
    });

    expect(parseIssueIdFromBranch({
        org: 'vertesia',
        repo: 'studio',
        branch: 'feat-123',
    })).toEqual({
        org: 'vertesia',
        repo: 'studio',
        number: 123,
    });
});

test('Parse issue ID from comment', async () => {
    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: `\
## Description

- #123
`
    })).toEqual([
        {
            org: 'vertesia',
            repo: 'studio',
            number: 123,
        },
    ]);

    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: 'This is a test',
    })).toEqual([]);

    expect(parseIssueIdsFromComment({
        org: 'vertesia',
        repo: 'studio',
        comment: `\
## Description

- https://github.com/vertesia/composableai/issues/123
`}
    )).toEqual([
        {
            org: 'vertesia',
            repo: 'composableai',
            number: 123,
        }
    ]);
});
