import * as vscode from "vscode";
import { lint } from "./buf";
import { isError } from "./errors";
import { parseLines, Warning } from "./parser";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "vscode-buf.lint"
  );
  const doLint = (document: vscode.TextDocument) => {
    if (!document.uri.path.endsWith(".proto")) {
      return;
    }

    if (vscode.workspace.workspaceFolders === undefined) {
      console.log("workspace folders was undefined");
      return;
    }
    if (vscode.workspace.workspaceFolders.length === 0) {
      console.log("workspace folders was not set");
      return;
    }
    const uri = vscode.workspace.workspaceFolders[0].uri;
    if (uri.scheme !== "file") {
      console.log("uri was not file: ", uri.scheme);
      return;
    }

    const binaryPath = vscode.workspace
      .getConfiguration("buf")!
      .get<string>("binaryPath");
    if (binaryPath === undefined) {
      console.log("buf binary path was not set");
      return;
    }

    const lines = lint(binaryPath, document.uri.fsPath, uri.fsPath);
    if (isError(lines)) {
      if (lines.errorMessage.includes("ENOENT")) {
        vscode.window.showInformationMessage(
          `Failed to execute buf, is it installed?`
        );
        return;
      }
      vscode.window.showInformationMessage(
        `Failed to execute 'buf check lint': ${lines}`
      );
      return;
    }
    const warnings = parseLines(lines);
    if (isError(warnings)) {
      console.log(warnings);
      return;
    }
    const diagnostics = warnings.map(
      (error: Warning): vscode.Diagnostic => {
        // VSC lines and columns are 0 indexed, so we need to subtract
        const range = new vscode.Range(
          error.start_line - 1,
          error.start_column - 1,
          error.end_line - 1,
          error.end_column - 1
        );
        return new vscode.Diagnostic(
          range,
          `${error.message} (${error.type})`,
          vscode.DiagnosticSeverity.Warning
        );
      }
    );
    diagnosticCollection.set(document.uri, diagnostics);
  };

  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doLint));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doLint));
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "vscode-buf.lint",
      (textEditor: vscode.TextEditor) => {
        doLint(textEditor.document);
      }
    )
  );
}

// Nothing to do for now
export function deactivate() {}
