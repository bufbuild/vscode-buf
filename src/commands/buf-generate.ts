import * as vscode from "vscode";

import { Command } from "./command";
import { bufState } from "../state";
import { log } from "../log";

/**
 * bufGenerate runs `buf generate` at the root of each VS Code workspace folder. If there
 * are no workspace folders, then `buf generate` displays a warning and is a no-op.
 */
export const bufGenerate = new Command(
  "buf.generate",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf generate"`);
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["generate"], workspaceFolder.uri.path);
    }
  }
);
