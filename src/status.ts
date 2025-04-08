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
  },
  [ServerStatus.SERVER_STARTING]: {
    icon: "$(sync~spin)",
    command: commands.showOutput.command,
  },
  [ServerStatus.SERVER_RUNNING]: {
    icon: "$(check)",
    command: commands.showCommands.command,
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
};

const busyStatusBarConfig: StatusBarConfig = {
  icon: "$(loading~spin)",
};

export function activate(ctx: vscode.ExtensionContext, bufCtx: BufContext) {
  updateStatusBar(bufCtx);

  ctx.subscriptions.push(
    bufCtx.onDidChangeContext(() => {
      updateStatusBar(bufCtx);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateModule(bufCtx);
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

  updateModule(bufCtx);

  const config = bufCtx.busy ? busyStatusBarConfig : icons[bufCtx.status];

  statusBarItem.text = `${config.icon} Buf${bufCtx.buf?.version ? ` (${bufCtx.buf.version})` : ""}`;
  statusBarItem.color = config.colour;
  statusBarItem.command = config.command || commands.showOutput.command;
  statusBarItem.tooltip = new vscode.MarkdownString("", true);
  statusBarItem.tooltip.supportHtml = true;

  if (config.tooltip) {
    statusBarItem.tooltip.appendMarkdown(`${config.tooltip}\n\n`);
  } else if (bufCtx.module) {
    statusBarItem.tooltip.appendMarkdown(
      `$(file-submodule) ${bufCtx.module}\n\n`
    );
  }
};

const updateModule = (bufCtx: BufContext) => {
  if (vscode.window.activeTextEditor) {
    const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
    const relPath = vscode.workspace.asRelativePath(filePath);
    bufCtx.module = bufCtx.bufFiles.get(relPath)?.module || "";
  } else {
    bufCtx.module = "";
  }
};

export const disposeStatusBar = () => {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
};
