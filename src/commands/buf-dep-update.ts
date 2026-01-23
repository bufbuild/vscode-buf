import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufDepUpdate runs `buf dep update` at the root of each VS Code workspace folder. If there
 * are no workspace folders, then bufDepUpdate displays a warning and is a no-op.
 */
export const bufDepUpdate = new Command(
  "buf.depupdate",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf dep update"`);
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["dep", "update"], workspaceFolder.uri.fsPath);
    }
  }
);
