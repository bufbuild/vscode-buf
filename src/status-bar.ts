import * as vscode from "vscode";
import { showCommands } from "./commands/show-commands";
import { showOutput } from "./commands/show-output";
import { startLanguageServer } from "./commands/start-lsp";
import { bufState } from "./state";
import type { LanguageServerStatus } from "./status";

/**
 * @file Provides handling for the status bar.
 *
 * https://code.visualstudio.com/api/ux-guidelines/status-bar
 */

let statusBarItem: vscode.StatusBarItem | undefined;
let statusBarActiveEditorListener: vscode.Disposable | undefined;
let isStatusBarVisible = false;

const statusBarItemName = "Buf";

type StatusBarConfig = {
  icon: string;
  colour?: vscode.ThemeColor;
  command?: string;
  tooltip?: string;
};

const languageServerStatusConfig: Record<
  LanguageServerStatus,
  StatusBarConfig
> = {
  LANGUAGE_SERVER_DISABLED: {
    icon: "$(circle-slash)",
    colour: new vscode.ThemeColor("statusBarItem.warningBackground"),
    tooltip: "$(circle-slash) Language server disabled",
  },
  LANGUAGE_SERVER_STARTING: {
    icon: "$(sync~spin)",
    command: showOutput.name,
    tooltip: "$(debug-start) Starting language server",
  },
  LANGUAGE_SERVER_RUNNING: {
    icon: "$(check)",
    command: showCommands.name,
    tooltip: "$(check) Language server running",
  },
  LANGUAGE_SERVER_STOPPED: {
    icon: "$(x)",
    command: startLanguageServer.name,
    tooltip: "$(debug-restart) Restart language server",
  },
  LANGUAGE_SERVER_ERRORED: {
    icon: "$(error)",
    colour: new vscode.ThemeColor("statusBarItem.errorBackground"),
    command: startLanguageServer.name,
    tooltip: "$(debug-restart) Restart language server",
  },
};

const busyStatusConfig: StatusBarConfig = {
  icon: "$(loading~spin)",
};

/**
 * Manage the status bar configuration based on the extension status and LSP server status.
 * If no status bar item is currently active, this is a no-op.
 */
function updateStatusBar() {
  // If there is no status bar item set, updating is a no-op.
  if (!statusBarItem) {
    return;
  }
  const config =
    bufState.getExtensionStatus() === "EXTENSION_PROCESSING"
      ? busyStatusConfig
      : languageServerStatusConfig[bufState.getLanguageServerStatus()];
  const bufBinaryVersion = bufState.getBufBinaryVersion() ?? "";
  statusBarItem.text = `${config.icon} Buf${bufBinaryVersion ? ` (${bufBinaryVersion})` : ""}`;
  statusBarItem.color = config.colour;
  statusBarItem.command = config.command;
  statusBarItem.tooltip = new vscode.MarkdownString("", true);
  if (config.tooltip) {
    statusBarItem.tooltip.appendMarkdown(`${config.tooltip}\n\n`);
  }
}

/**
 * Document selector for files where the status bar should be visible.
 * Includes proto files, Buf configuration files, and Buf output channels.
 */
const bufDocumentSelector: vscode.DocumentSelector = [
  { language: "proto" },
  { pattern: "**/buf.yaml" },
  { pattern: "**/buf.gen.yaml" },
  { pattern: "**/buf.lock" },
  { pattern: "**/buf.mod" },
  { pattern: "**/buf.work" },
  { pattern: "**/buf.work.yaml" },
  { pattern: "**/buf.plugin.yaml" },
  { scheme: "output", pattern: "extension-output-bufbuild.vscode-buf*" },
];

/**
 * Update the status bar visibility based on the active editor.
 * Only shows the status bar when viewing proto files, Buf configuration files, or Buf output channels.
 */
function updateStatusBarVisibility(editor: vscode.TextEditor | undefined) {
  if (!statusBarItem) {
    return;
  }

  if (
    editor != null &&
    vscode.languages.match(bufDocumentSelector, editor.document) > 0
  ) {
    statusBarItem.show();
    isStatusBarVisible = true;
  } else {
    statusBarItem.hide();
    isStatusBarVisible = false;
  }
}

export function activateStatusBar(ctx: vscode.ExtensionContext) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      statusBarItemName,
      vscode.StatusBarAlignment.Right
    );
    updateStatusBarVisibility(vscode.window.activeTextEditor);
    statusBarActiveEditorListener = vscode.window.onDidChangeActiveTextEditor(
      (editor) => updateStatusBarVisibility(editor)
    );
    ctx.subscriptions.push(statusBarActiveEditorListener);

    // Register callback to update status bar when state changes
    bufState.registerStatusChangeCallback(() => {
      updateStatusBar();
    });
    // Initial update
    updateStatusBar();
  }
}

export function deactivateStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
  if (statusBarActiveEditorListener) {
    statusBarActiveEditorListener.dispose();
    statusBarActiveEditorListener = undefined;
  }
  isStatusBarVisible = false;
}

/**
 * Get the current status bar item for testing purposes.
 * @internal
 */
export function getStatusBarItem(): vscode.StatusBarItem | undefined {
  return statusBarItem;
}

/**
 * Get the current status bar visibility state for testing purposes.
 * @internal
 */
export function isStatusBarItemVisible(): boolean {
  return isStatusBarVisible;
}
