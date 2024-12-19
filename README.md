# demo-github

This projects demonstrates the integration of GitHub Agent into the Composable as a collection of Agentic Workflows.

## NPM Registry

We use Google Artifact Registry to store the private NPM packages.

### Login

```sh
pnpm run artifactregistry-login --repo-config=.npmrc
#
#> @becomposable/demo-github-root@1.0.0 artifactregistry-login /Users/mincong/github/demo-github
#> pnpm exec artifactregistry-auth "--repo-config=.npmrc"
#
#(node:85854) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
#(Use `node --trace-deprecation ...` to show where the warning was created)
#Retrieving application default credentials...
#Retrieving credentials from gcloud...
#Success!
```

### Publish

```sh
pnpm publish packages/github-agent
```
