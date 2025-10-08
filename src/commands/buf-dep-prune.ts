import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufDepPrune runs `buf dep prune` at the root of each VS Code workspace folder. If there
 * are no workspace folders, then bufDepPrune displays a warning and is a no-op.
 */
export const bufDepPrune = new Command(
  "buf.depprune",
  "COMMAND_TYPE_BUF",
  async () => {
    log.show();
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf dep prune"`);
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(["dep", "prune"], workspaceFolder.uri.path);
    }
  }
);
