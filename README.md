# demo-github

This projects demonstrates the integration of GitHub Agent into the Composable as a collection of Agentic Workflows.

## NPM Registry

We use Google Artifact Registry to store the private NPM packages.

### Login

```sh
cd packages/github-agent
pnpm run artifactregistry-login
#
# > @becomposable/github-agent@1.0.0 artifactregistry-login /Users/mincong/github/demo-github/packages/github-agent
# > pnpm exec artifactregistry-auth
#
# ...
# Retrieving application default credentials...
# Retrieving credentials from gcloud...
# Success!
```
