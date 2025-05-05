# Development Guide

## Code Structure

This Git repository is a pnpm workspace, organized in the following ways:

- The applications are stored under the directory "./apps/<app>", such as "./apps/github-agent".
- The internal documentation is stored under the directory "./docs".
- The main technology used for developping the Github Agent (`./apps/github-agent`) is Temporal Workflow JS SDK.

## Code Style


- For Temporal activities (`./apps/github-agent/src/activities.ts` or `./apps/github-agent/src/activities/**`), the input arguments and output arguments should be represented as a structure in Typescript, using the naming convention `${activity}Request` and `${activity}Response`. For example, if the name of the activity is `getGuideline`, then the request should be `GetGuildlineRequest` and the response should be `GetGuildlineResponse`.
