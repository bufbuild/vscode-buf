import * as vscode from "vscode";
import { registerAllCommands } from "./commands/register-all-commands";
import { installBuf } from "./commands/install-buf";
import { startBuf } from "./commands/start-buf";
import { stopBuf } from "./commands/stop-buf";

import { activateStatusBar, deactivateStatusBar } from "./status-bar";
import { bufState } from "./state";
import { log } from "./log";

/**
 * activate is the entrypoint for activating the extension.
 */
export async function activate(ctx: vscode.ExtensionContext) {
  activateStatusBar(ctx);
  registerAllCommands(ctx);
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handleOnDidConfigChange)
  );

  if (!bufState.buf) {
    log.warn("No buf cli found. Installing buf...");
    await installBuf.execute();
  }
}

/**
 * deactivate runs when the extension is deactivated.
 */
export async function deactivate() {
  log.info("Deactivating extension.");

  await stopBuf.execute();
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
    await installBuf.execute();
  }
  if (e.affectsConfiguration("buf.enable")) {
    await startBuf.execute();
  }
};
