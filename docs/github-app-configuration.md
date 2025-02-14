# GitHub App Configuration

To enable the GitHub webhook, we need to create a GitHub App to subscribe to GitHub events. Here are the events to which the app is subscribed.

Category | Event | Description | Reason
--- | --- | --- | ---
Project | Issue comment | Issue comment created, edited, or deleted. | Useful for assisting in project management.
Project | Issues | Issue opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, unlabeled, milestoned, demilestoned, locked, or unlocked. | Useful for assisting the project management.
Project | Label | Label created, edited or deleted. | Potentially useful for assisting in project management.
Project | Milestone | Milestone created, closed, opened, edited, or deleted. | Potentially useful for assisting in project management.
Review | Pull request | Pull request assigned, auto merge disabled, auto merge enabled, closed, converted to draft, demilestoned, dequeued, edited, enqueued, labeled, locked, milestoned, opened, ready for review, reopened, review request removed, review requested, synchronized, unassigned, unlabeled, or unlocked. | Useful for assisting in code review.
Review | Pull request review | Pull request review submitted, edited, or dismissed. |
Review | Pull request review comment | Pull request diff comment created, edited, or deleted. |
Review | Pull request review thread | A pull request review thread was resolved or unresolved. | 
Changes | Status | Commit status updated from the API. |
Changes | Push | Git push to a repository. |
Workflow | Workflow dispatch | A manual workflow run is requested. |
Workflow | Workflow job | Workflow job queued, waiting, in progress, or completed on a repository. |
Workflow | Workflow run | Workflow run requested or completed on a repository. |

## Permissions

* **Read** access to Dependabot alerts, actions, actions variables, administration, attestations api, checks, code, codespaces, codespaces lifecycle admin, codespaces metadata, commit statuses, deployments, discussions, environments, merge queues, metadata, packages, pages, repository advisories, repository custom properties, repository hooks, secret scanning alerts, and security events
* **Read** and **write** access to issues, pull requests, and repository projects
