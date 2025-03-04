import { expect, test } from 'vitest';
import { GithubIssueRef } from './types';

test('Get issue URL for org \"becomposable\"', async () => {
    const ref = new GithubIssueRef('becomposable', 'studio', 123);
    expect(ref.toHtmlUrl()).toEqual('https://github.com/vertesia/studio/issues/123');
});
