// import { TestWorkflowEnvironment } from '@temporalio/testing';

// let testEnv: TestWorkflowEnvironment;

// // beforeAll and afterAll are injected by Jest
// beforeAll(async () => {
//   testEnv = await TestWorkflowEnvironment.createTimeSkipping();
// });

// afterAll(async () => {
//   await testEnv?.teardown();
// });

import { describe, test } from 'vitest'

describe('Workflow Test Suite', () => {
  test('Test 1', async () => { /* ... */ })
  test('Test 2', async () => { /* ... */ })
})
