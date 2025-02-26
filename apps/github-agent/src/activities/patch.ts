type Hunk = {
    leftStartLine: number,
    leftEndLine: number, // exclusive
    leftLineCount: number,
    rightStartLine: number,
    rightEndLine: number, // exclusive
    rightLineCount: number,
}

export class HunkSet {
    private hunks: Hunk[];

    constructor(hunks: Hunk[]) {
        this.hunks = hunks;
    }

    public isLineValid(side: string | undefined, line: number): boolean {
        if (side === 'LEFT') {
            return this.isLeftLineValid(line);
        } else {
            return this.isRightLineValid(line);
        }
    }

    private isLeftLineValid(line: number): boolean {
        for (const hunk of this.hunks) {
            if (line >= hunk.leftStartLine && line <= hunk.leftEndLine) {
                return true;
            }
        }
        return false;
    }

    private isRightLineValid(line: number): boolean {
        for (const hunk of this.hunks) {
            if (line >= hunk.rightStartLine && line <= hunk.rightEndLine) {
                return true;
            }
        }
        return false;
    }

    static parse(patchContent: string): HunkSet {
        const hunks: Hunk[] = [];
        const lines = patchContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('@@')) {
                const match = line.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
                if (match) {
                    hunks.push({
                        leftStartLine: parseInt(match[1]),
                        leftLineCount: parseInt(match[2]),
                        leftEndLine: parseInt(match[1]) + parseInt(match[2]),
                        rightStartLine: parseInt(match[3]),
                        rightLineCount: parseInt(match[4]),
                        rightEndLine: parseInt(match[3]) + parseInt(match[4]),
                    });
                }
            }
        }
        return new HunkSet(hunks);
    }
}
