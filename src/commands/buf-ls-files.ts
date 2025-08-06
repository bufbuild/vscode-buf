import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufLsFiles shows the output channel and runs `buf ls-files` at the root of each VS Code
 * workspace folder. If there are no workspace folders, then bufLsFiles displays a warning
 * and is a no-op.
 */
export const bufLsFiles = new Command(
  "buf.lsfiles",
  "COMMAND_TYPE_BUF",
  async () => {
    log.show();
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf ls-files"`);
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["ls-files"], workspaceFolder.uri.path);
    }
  }
);
