import { effect } from "@preact/signals-core";
import * as vscode from "vscode";
import { installBuf } from "./commands/install-buf";
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
    bufState.getExtensionStatus() === "EXTENSION_PROCESSING"
      ? busyStatusConfig
      : languageServerStatusConfig[bufState.getLanguageServerStatus()];
  const bufBinaryVersion = bufState.getBufBinaryVersion();
  statusBarItem.text = `${config.icon} Buf${bufBinaryVersion ? ` (${bufBinaryVersion})` : ""}`;
  statusBarItem.color = config.colour;
  statusBarItem.command = config.command;
  statusBarItem.tooltip = new vscode.MarkdownString("", true);
  statusBarItem.tooltip.supportHtml = true;
  if (config.tooltip) {
    statusBarItem.tooltip.appendMarkdown(`${config.tooltip}\n\n`);
  }
}

export function activateStatusBar(_ctx: vscode.ExtensionContext) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      statusBarItemName,
      vscode.StatusBarAlignment.Right
    );
    statusBarItem.show();
  }
  effect(() => {
    updateStatusBar();
  });
}

export function deactivateStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
