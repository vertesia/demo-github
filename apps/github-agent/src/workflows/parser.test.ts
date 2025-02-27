import { expect, test } from 'vitest';
import {
    parseIssueIdFromBranch,
    parseIssueIdFromComment,
} from './parser';

test('Parse issue ID from Git branch', async () => {
    expect(parseIssueIdFromBranch('feat/123/my-feature')).toEqual(123);
    expect(parseIssueIdFromBranch('feat-123')).toEqual(123);
});

test('Parse issue ID from comment', async () => {
    expect(parseIssueIdFromComment(`\
## Description

- #123
`
    )).toEqual([123, undefined]);

    expect(parseIssueIdFromComment('This is a test')).toEqual([
        undefined,
        new Error('Could not parse issue id from comment.'),
    ]);

    expect(parseIssueIdFromComment(`
## Description

- https://github.com/vertesia/studio/issues/123
`)).toEqual([123, undefined]);

});
