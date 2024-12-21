import { TestWorkflowEnvironment } from '@temporalio/testing';

let testEnv: TestWorkflowEnvironment;

// beforeAll and afterAll are injected by Jest
beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createTimeSkipping();
});

afterAll(async () => {
  await testEnv?.teardown();
});