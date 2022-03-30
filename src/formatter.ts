import * as cp from "child_process";
import * as path from "path";
import * as vscode from "vscode";

export class Formatter implements vscode.DocumentFormattingEditProvider {
    readonly binaryPath: string = '';

    constructor(binaryPath: string) {
        if (!binaryPath || binaryPath.length === 0) {
            throw new Error('binaryPath is required to construct a formatter');
        }
        this.binaryPath = binaryPath;
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        // @ts-ignore: The formatter doesn't have any options, but we need to implement the interface.
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        if (vscode.window.visibleTextEditors.every((e) => e.document.fileName !== document.fileName)) {
            return [];
        }
        return this.runFormatter(document, token).then(
            (edits) => edits,
            (err) => {
                console.log(err);
                return Promise.reject('Check the console in dev tools to find errors when formatting.');
            }
        );
    }

    private runFormatter(
        document: vscode.TextDocument,
        // @ts-ignore: TODO: Use the CancellationToken.
        token: vscode.CancellationToken
    ): Thenable<vscode.TextEdit[]> {
        return new Promise<vscode.TextEdit[]>((resolve, reject) => {
            const cwd = path.dirname(document.fileName);
            let stdout = '';
            let stderr = '';

            // Use spawn instead of exec to avoid maxBufferExceeded error
            const p = cp.spawn(this.binaryPath, [document.fileName], { cwd });
            // TODO: We need to use the CancellationToken.
            p.stdout.setEncoding('utf8');
            p.stdout.on('data', (data: any) => (stdout += data));
            p.stderr.on('data', (data: any) => (stderr += data));
            p.on('error', (err: any) => {
            if (err && (<any>err).code === 'ENOENT') {
                return reject();
            }
            });
            p.on('close', (code: number) => {
                if (code !== 0) {
                    return reject(stderr);
                }
                const fileStart = new vscode.Position(0, 0);
                const fileEnd = document.lineAt(document.lineCount - 1).range.end;
                const textEdits: vscode.TextEdit[] = [
                    new vscode.TextEdit(new vscode.Range(fileStart, fileEnd), stdout)
                ];
                return resolve(textEdits);
            });
        });
    }
}
