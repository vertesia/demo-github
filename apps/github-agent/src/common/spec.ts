export class PullRequestWorkflowSpec {
    constructor(public org: string, public repo: string, public pullRequestNumber: number) { }

    public get workflowId(): string {
        return `${this.org}/${this.repo}/pull/${this.pullRequestNumber}`;
    }

    public get codeReviewChildWorkflowId(): string {
        return `${this.org}/${this.repo}/pull/${this.pullRequestNumber}:review`;
    }
}