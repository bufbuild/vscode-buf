import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * Minimum Buf version required for `buf stats` command.
 */
const minBufVersion = "v1.55.0";

/**
 * Minimum Buf version required for `buf beta stats` command.
 */
const minBetaVersion = "v1.17.0";

/**
 * bufStats shows the output channel and runs `buf stats` at the root of each VS Code
 * workspace folder. If there are no workspace folders, then bufStats displays a warning
 * and is a no-op.
 */
export const bufStats = new Command(
  "buf.stats",
  "COMMAND_TYPE_BUF",
  async () => {
    log.show();
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf stats"`);
      return;
    }
    const bufVersion = bufState.getBufBinaryVersion();
    let args = ["stats"];
    if (bufVersion?.compare(minBufVersion) === -1) {
      args = ["beta", "stats"];
      if (bufVersion?.compare(minBetaVersion) === -1) {
        log.warn(
          `Current Buf Version ${bufVersion} does not meet minimum required version of stats command ${minBetaVersion}, unable to run "buf stats".`
        );
        return;
      }
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(args, workspaceFolder.uri.path);
    }
  }
);
