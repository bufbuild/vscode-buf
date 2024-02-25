import * as vscode from "vscode";
import {LanguageClient} from 'vscode-languageclient/node';
import { downloadPage, lint, minimumVersion, version } from "./buf";
import { isError } from "./errors";
import { Formatter } from "./formatter";
import { parseLines, Warning } from "./parser";
import { format, less } from "./version";
import { getBinaryPath } from "./get-binary-path";
import { newBufLanguageClient } from "./language-server"

let languageClient : LanguageClient

export function activate(context: vscode.ExtensionContext) {
  const { binaryPath } = getBinaryPath();
  if (binaryPath === undefined) {
    return;
  }

  const binaryVersion = version(binaryPath);
  if (isError(binaryVersion)) {
    vscode.window.showInformationMessage(
      `Failed to get buf version: ${binaryVersion.errorMessage}`
    );
  } else {
    if (less(binaryVersion, minimumVersion)) {
      vscode.window
        .showErrorMessage(
          `This version of vscode-buf requires at least version ${format(
            minimumVersion
          )} of buf.
          You are currently on version ${format(binaryVersion)}.`,
          "Go to download page"
        )
        .then((selection: string | undefined) => {
          if (selection === undefined || selection !== "Go to download page") {
            return;
          }
          vscode.env.openExternal(vscode.Uri.parse(downloadPage));
        });
      return;
    }
    // Don't check for latest version right now,
    // adds a lot of overhead to keep updated
    /*
    if (less(binaryVersion, latestVersion)) {
      vscode.window
        .showInformationMessage(
          `A new version of buf is available (${format(latestVersion)}).`,
          "Go to download page"
        )
        .then((selection: string | undefined) => {
          if (selection === undefined || selection !== "Go to download page") {
            return;
          }
          vscode.env.openExternal(vscode.Uri.parse(downloadPage));
        });
    }
    */
  }

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("vscode-buf.lint");
  const doLint = (document: vscode.TextDocument) => {
    if (!document.uri.path.endsWith(".proto")) {
      return;
    }

    const { binaryPath, cwd } = getBinaryPath();
    if (binaryPath === undefined) {
      return;
    }

    const lines = lint(binaryPath, document.uri.fsPath, cwd);
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
    const warningsForThisDocument = warnings.filter(
      (warning: Warning): Boolean => {
        return warning.path === document.uri.fsPath;
      }
    );
    const diagnostics = warningsForThisDocument.map(
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

  const formatter = new Formatter(binaryPath);
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("proto", formatter)
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("proto3", formatter)
  );
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

  languageClient = newBufLanguageClient(binaryPath)
  languageClient.start()
}

// Nothing to do for now
export function deactivate() {
  if (!languageClient) {
    return undefined;
  }
  return languageClient.stop();
}
