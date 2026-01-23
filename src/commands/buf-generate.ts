import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufGenerate runs `buf generate` at the root of each VS Code workspace folder. If there
 * are no workspace folders, then bufGenerate displays a warning and is a no-op.
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
      bufState.execBufCommand(["generate"], workspaceFolder.uri.fsPath);
    }
  }
);
