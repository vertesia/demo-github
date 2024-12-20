# demo-github

This projects demonstrates the integration of GitHub Agent into the Composable as a collection of Agentic Workflows.

## Release

The release process is semi-automatic. You need to bump the version of the AI Agent using the `pnpm version` command and push the generated tag to GitHub. Once done, the CI will publish a new version to the NPM Registry. Assume that you are releasing the package `v1.2.0`, here is how would you do it from the `main` branch:

```sh
cd packages/github-agent
# major: if your workflows are no longer compatible with the existing format
# minor: normal updates
# patch: unused for now
pnpm version minor
# a commit is made by Git

# push changes
git push origin main
git push origin v1.2.0
```

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
