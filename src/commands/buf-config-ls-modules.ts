import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * Minimum Buf version required for `buf config ls-modules` command.
 */
const minBufVersion = "v1.34.0";

/**
 * bufConfigLsModules shows the output channel and runs `buf config ls-modules` at the root
 * of each VS Code workspace folder. If there are no workspace folders, then bufConfigLsModules
 * displays a warning and is a no-op.
 */
export const bufConfigLsModules = new Command(
  "buf.configlsmodules",
  "COMMAND_TYPE_BUF",
  async () => {
    log.show();
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf config ls-modules"`);
      return;
    }
    const bufVersion = bufState.getBufBinaryVersion();
    if (bufVersion?.compare(minBufVersion) === -1) {
      log.warn(
        `Current Buf Version ${bufVersion} does not meet minimum required version ${minBufVersion}, unable to run "buf config ls-modules".`
      );
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(
        ["config", "ls-modules"],
        workspaceFolder.uri.path
      );
    }
  }
);
