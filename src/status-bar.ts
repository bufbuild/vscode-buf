import * as vscode from "vscode";

import { showCommands } from "./commands/show-commands";
import { showOutput } from "./commands/show-output";
import { startBuf } from "./commands/start-buf";
import { installBuf } from "./commands/install-buf";
import { LanguageServerStatus } from "./status";
import { bufState } from "./state";

/**
 * @file Provides handling for the status bar.
 *
 * https://code.visualstudio.com/api/ux-guidelines/status-bar
 */

let statusBarItem: vscode.StatusBarItem | undefined;

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
    command: startBuf.name,
    tooltip: "$(debug-restart) Restart language server",
  },
  LANGUAGE_SERVER_ERRORED: {
    icon: "$(error)",
    colour: new vscode.ThemeColor("statusBarItem.errorBackground"),
    command: startBuf.name,
    tooltip: "$(debug-restart) Restart language server",
  },
  LANGUAGE_SERVER_NOT_INSTALLED: {
    icon: "$(circle-slash)",
    colour: new vscode.ThemeColor("statusBarItem.errorBackground"),
    command: installBuf.name,
    tooltip: "$(circle-slash) Buf not installed",
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
    bufState.getExtensionStatus() == "EXTENSION_PROCESSING"
      ? busyStatusConfig
      : languageServerStatusConfig[bufState.languageServerStatus];
  statusBarItem.text = `${config.icon} Buf${bufState.buf?.version ? ` (${bufState.buf.version})` : ""}`;
  statusBarItem.color = config.colour;
  statusBarItem.command = config.command;
  statusBarItem.tooltip = new vscode.MarkdownString("", true);
  statusBarItem.tooltip.supportHtml = true;
  if (config.tooltip) {
    statusBarItem.tooltip.appendMarkdown(`${config.tooltip}\n\n`);
  }
}

export function activateStatusBar(ctx: vscode.ExtensionContext) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      statusBarItemName,
      vscode.StatusBarAlignment.Right
    );
    statusBarItem.show();
  }
  ctx.subscriptions.push(
    bufState.onDidChangeState(() => {
      updateStatusBar();
    })
  );
}

export function deactivateStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
