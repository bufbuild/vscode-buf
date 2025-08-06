import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * Buf version with the most recent price update.
 */
const lastPriceUpdate = "v1.28.0";

/**
 * Minimum Buf version required for `buf beta price` command.
 */
const minBetaVersion = "v1.16.0";

/**
 * bufPrice shows the output channel and runs `buf beta price` at the root of each VS Code
 * workspace folder. If there are no workspace folders, then bufPrice displays a warning
 * and is a no-op.
 */
export const bufPrice = new Command(
  "buf.price",
  "COMMAND_TYPE_BUF",
  async () => {
    log.show();
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf beta price"`);
      return;
    }
    const bufVersion = bufState.getBufBinaryVersion();
    if (bufVersion?.compare(minBetaVersion) === -1) {
      log.warn(
        `Current Buf Version ${bufVersion} does not meet minimum required version of price command ${minBetaVersion}, unable to run "buf beta price".`
      );
      return;
    }
    if (bufVersion?.compare(lastPriceUpdate) === -1) {
      log.warn(
        `Current Buf Version ${bufVersion} has outdated price data, latest price update available for version ${lastPriceUpdate} and onwards.`
      );
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["beta", "price"], workspaceFolder.uri.path);
    }
  }
);
