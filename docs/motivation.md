# GitHub Agent

The GitHub Agent is built to assist with the pull-request process.

* **It facilitates the navigation to the cloud resources.** When a pull request is created, a new development environment is created. This agent makes a comment to indicate the deployment specification and how to navigate to different resources. Instead of reading the document, it provides highly relevant information so that the author and reviewers of the pull request can focus on the actual review and validation rather than looking for information in different places. Unlike Vercel, this comment is closer to our business logic and fully covers various resources. See example https://github.com/vertesia/studio/pull/1214#issuecomment-2664941283
* **It summarizes the code changes to facilitate the code review.** When a new pull request is created, a summary is made to explain the code changes in human-readable text so the reviewer can better understand the changes.

## References

- https://www.coderabbit.ai/
- https://github.blog/changelog/2024-10-29-github-copilot-code-review-in-github-com-public-preview/
