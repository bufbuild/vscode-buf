import * as vscode from "vscode";
import * as commands from "./commands";
import * as config from "./config";
import * as status from "./status";

import { BufContext, ServerStatus } from "./context";
import { log } from "./log";

const bufCtx = new BufContext();

export async function activate(ctx: vscode.ExtensionContext) {
  status.activate(ctx, bufCtx);

  commands.registerAllCommands(ctx, bufCtx);

  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handleOnDidConfigChange)
  );

  await commands.findBuf.execute();

  if (!bufCtx.buf) {
    log.warn("No buf cli found. Installing buf...");
    await commands.installBuf.execute();
  }

  if (config.get<boolean>("checkUpdates")) {
    // Check asynchronously for updates.
    commands.updateBuf.execute();
  }

  // We may have already started running if we had to install buf, so don't try
  // and start if we're already running.
  if (bufCtx.buf && bufCtx.status !== ServerStatus.SERVER_RUNNING) {
    // Start the language server
    await commands.restartBuf.execute();
  }
}

// Nothing to do for now
export async function deactivate() {
  log.info("Deactivating extension.");

  await bufCtx.client?.stop();
  bufCtx.client = undefined;
  bufCtx.status = ServerStatus.SERVER_STOPPED;

  status.disposeStatusBar();
}

const handleOnDidConfigChange = async (e: vscode.ConfigurationChangeEvent) => {
  if (!e.affectsConfiguration("buf")) {
    return;
  }

  if (e.affectsConfiguration("buf.commandLine.path")) {
    await commands.findBuf.execute();
    commands.restartBuf.execute();
  }
};
