import * as vscode from "vscode";
import { registerAllCommands } from "./commands/register-all-commands";
import { installBuf } from "./commands/install-buf";
import { startLanguageServer } from "./commands/start-lsp";
import { stopLanguageServer } from "./commands/stop-lsp";

import { activateStatusBar, deactivateStatusBar } from "./status-bar";
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
  await installBuf.execute();
}

/**
 * deactivate runs when the extension is deactivated.
 */
export async function deactivate() {
  log.info("Deactivating extension.");

  await stopLanguageServer.execute();
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
    await startLanguageServer.execute();
  }
};
