#!/usr/bin/env node

import { bundleWorkflowCode } from '@temporalio/worker';
import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Bundles all workflows in the given directory and produces a single output file.
 *
 * @param {string} workflowsPath the path to the workflows directory
 * @param {string} bundlePath the path to write the bundled code to
 */
async function bundle(workflowsPath, bundlePath) {
    const { code } = await bundleWorkflowCode({
        workflowsPath: path.resolve(workflowsPath),
    });
    const bundleAbsolutePath = path.resolve(bundlePath);
    await writeFile(bundleAbsolutePath, code);
    console.log(`Bundle written to ${bundleAbsolutePath}`);
}

const wsPath = process.argv[2];
const bundlePath = process.argv[3];
if (!wsPath || !bundlePath) {
    console.error('Usage: build-workflows <workflows-path> <bundle-path>');
    process.exit(1);
}

bundle(wsPath, bundlePath).catch((err) => {
    console.error(err);
    process.exit(1);
});
