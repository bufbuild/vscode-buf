import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufConfigInit shows the output channel and runs `buf config init`.
 */
export const bufConfigInit = new Command(
  "buf.configinit",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf config init"`);
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["config", "init"], workspaceFolder.uri.fsPath);
    }
  }
);
