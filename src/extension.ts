import * as vscode from "vscode";
import { installBuf } from "./commands/install-buf";
import { registerAllCommands } from "./commands/register-all-commands";
import { startLanguageServer } from "./commands/start-lsp";
import { stopLanguageServer } from "./commands/stop-lsp";
import { log } from "./log";
import { activateStatusBar, deactivateStatusBar } from "./status-bar";
import { bufState } from "./state";

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

/**
 * handleProtoFileOpened checks when a .proto file is opened and ensures the language server is running.
 */
const handleProtoFileOpened = async (document: vscode.TextDocument) => {
  if (document.languageId !== "proto") {
    return;
  }
  
  const languageServerStatus = bufState.getLanguageServerStatus();
  if (languageServerStatus === "LANGUAGE_SERVER_RUNNING") {
    // Language server is already running, nothing to do
    return;
  }
  
  // Start the language server if it's not running
  log.info("Proto file opened, ensuring language server is running...");
  await startLanguageServer.execute();
};
