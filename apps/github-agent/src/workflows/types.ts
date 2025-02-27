export type GithubIssue = {
    org: string,
    repo: string,
    title: string,
    body: string,
    number: number,
}

export class GithubIssueRef {
    constructor(public org: string, public repo: string, public number: number) { }

    public toHtmlUrl(): string {
        return `https://github.com/${this.org}/${this.repo}/issues/${this.number}`;
    }
}
