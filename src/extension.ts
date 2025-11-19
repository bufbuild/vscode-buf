import * as vscode from "vscode";
import { registerAllCommands } from "./commands/register-all-commands";
import { startLanguageServer } from "./commands/start-lsp";
import { stopLanguageServer } from "./commands/stop-lsp";
import { log } from "./log";
import { bufState } from "./state";
import { activateStatusBar, deactivateStatusBar } from "./status-bar";

/**
 * activate is the entrypoint for activating the extension.
 */
export async function activate(ctx: vscode.ExtensionContext) {
  activateStatusBar(ctx);
  registerAllCommands(ctx);
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handleOnDidConfigChange)
  );
  await bufState.init(ctx);
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
  if (e.affectsConfiguration("buf.debugLogs")) {
    // When debug logs configuration changes, restart the language server.
    await stopLanguageServer.execute();
    await startLanguageServer.execute();
  }
};
