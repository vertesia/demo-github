import { expect, test } from 'vitest';
import { parseIssueIdsFromComment } from './parser';

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
