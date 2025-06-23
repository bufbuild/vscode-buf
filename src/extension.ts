import * as vscode from "vscode";
import * as commands from "./commands";

import { activateStatusBar, deactivateStatusBar } from "./status-bar";
import { bufState } from "./state";
import { log } from "./log";

/**
 * activate is the entrypoint for activating the extension.
 */
export async function activate(ctx: vscode.ExtensionContext) {
  activateStatusBar(ctx);
  commands.registerAllCommands(ctx);
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handleOnDidConfigChange)
  );

  if (!bufState.buf) {
    log.warn("No buf cli found. Installing buf...");
    await commands.installBuf.execute();
  }
}

/**
 * deactivate runs when the extension is deactivated.
 */
export async function deactivate() {
  log.info("Deactivating extension.");

  await commands.stopBuf.execute();
  deactivateStatusBar();
}

/**
 * handleOnDidConfigChange checks if there are changes to the extension configuration.
 */
const handleOnDidConfigChange = async (e: vscode.ConfigurationChangeEvent) => {
  if (!e.affectsConfiguration("buf")) {
    return;
  }
  if (
    e.affectsConfiguration("buf.commandLine.path") ||
    e.affectsConfiguration("buf.commandLine.version")
  ) {
    await commands.installBuf.execute();
  }
};
