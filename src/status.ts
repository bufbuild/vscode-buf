import * as vscode from "vscode";
import * as commands from "./commands";

import { BufContext, ServerStatus } from "./context";

export let statusBarItem: vscode.StatusBarItem | undefined;

const StatusBarItemName = "Buf";

type StatusBarConfig = {
  icon: string;
  colour?: vscode.ThemeColor;
  command?: string;
  tooltip?: string;
};

const icons: Record<ServerStatus, StatusBarConfig> = {
  [ServerStatus.SERVER_DISABLED]: {
    icon: "$(circle-slash)",
    colour: new vscode.ThemeColor("statusBarItem.warningBackground"),
    tooltip: "$(circle-slash) Language server disabled",
  },
  [ServerStatus.SERVER_STARTING]: {
    icon: "$(sync~spin)",
    command: commands.showOutput.command,
    tooltip: "$(debug-start) Starting language server",
  },
  [ServerStatus.SERVER_RUNNING]: {
    icon: "$(check)",
    command: commands.showCommands.command,
    tooltip: "$(check) Language server running",
  },
  [ServerStatus.SERVER_STOPPED]: {
    icon: "$(x)",
    command: commands.restartBuf.command,
    tooltip: "$(debug-restart) Restart language server",
  },
  [ServerStatus.SERVER_ERRORED]: {
    icon: "$(error)",
    colour: new vscode.ThemeColor("statusBarItem.errorBackground"),
    command: commands.restartBuf.command,
    tooltip: "$(debug-restart) Restart language server",
  },
  [ServerStatus.SERVER_NOT_INSTALLED]: {
    icon: "$(circle-slash)",
    colour: new vscode.ThemeColor("statusBarItem.errorBackground"),
    command: commands.installBuf.command,
    tooltip: "$(circle-slash) Buf not installed",
  },
};

const busyStatusBarConfig: StatusBarConfig = {
  icon: "$(loading~spin)",
};

export function activate(ctx: vscode.ExtensionContext, bufCtx: BufContext) {
  updateStatusBar(bufCtx);

  ctx.subscriptions.push(
    bufCtx.onDidChangeContext(() => {
      updateStatusBar(bufCtx);
    })
  );
}

const updateStatusBar = (bufCtx: BufContext) => {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      StatusBarItemName,
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.name = StatusBarItemName;
    statusBarItem.show();
  }

  const config = bufCtx.busy ? busyStatusBarConfig : icons[bufCtx.status];

  statusBarItem.text = `${config.icon} Buf${bufCtx.buf?.version ? ` (${bufCtx.buf.version})` : ""}`;
  statusBarItem.color = config.colour;
  statusBarItem.command = config.command || commands.showOutput.command;
  statusBarItem.tooltip = new vscode.MarkdownString("", true);
  statusBarItem.tooltip.supportHtml = true;

  if (config.tooltip) {
    statusBarItem.tooltip.appendMarkdown(`${config.tooltip}\n\n`);
  }
};

export const disposeStatusBar = () => {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
};
