const enabledUserIds = [
    'antoine-regnier',
    'mincong-h',
];

type isAssistantEnabledOptions = {
    repoFullName: string;
    userId: string;
}
export function isAssistantEnabled(opts: isAssistantEnabledOptions): boolean {
    if (opts.repoFullName !== 'vertesia/studio') {
        return false;
    }
    return enabledUserIds.includes(opts.userId);
}
