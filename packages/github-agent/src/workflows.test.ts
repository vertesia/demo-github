import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import {
    afterAll,
    beforeAll,
    expect,
    test
} from 'vitest';
import type * as activities from './activities';
import { GetMultiRepoInfoResponse, getRepos } from './workflows';


let testEnv: TestWorkflowEnvironment;
let worker: Worker;

beforeAll(async () => {
    const mockActivities: Partial<typeof activities> = {
        getRepoInfo: async (request: activities.GetRepoInfoRequest): Promise<activities.GetRepoInfoResponse> => {
            const [owner, repo] = request.name.split('/');
            return {
                owner,
                repo,
                repo_url: `https://github.com/${owner}/${repo}`,
                description: '',
            };
        },
    };

    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
    worker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'test',
        activities: mockActivities,
        workflowsPath: require.resolve('./workflows.ts'),
    });
});

afterAll(async () => {
    await testEnv?.teardown();
});

test('workflow: getRepos', async () => {
    const result = await worker.runUntil(
        testEnv.client.workflow.execute(getRepos, {
            taskQueue: 'test',
            workflowId: 'test',
            args: [{
                names: [
                    'mincong-h/mincong-h.github.io',
                    'mincong-h/learning-node'
                ]
            }],
        })
    );
    expect(result).toEqual({
        count: 2,
        repos: [
            {
                owner: 'mincong-h',
                repo: 'mincong-h.github.io',
                repo_url: 'https://github.com/mincong-h/mincong-h.github.io',
                description: '',
            },
            {
                owner: 'mincong-h',
                repo: 'learning-node',
                repo_url: 'https://github.com/mincong-h/learning-node',
                description: '',
            },
        ]
    } as GetMultiRepoInfoResponse);
});