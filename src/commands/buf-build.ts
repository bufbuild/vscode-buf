import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * bufBuild prompts the user to provide an output path for the `buf build` command, and then
 * runs `buf build -o <output path>` at the root of each VS Code workspace folder.
 *
 * If there are no workspace folders, then bufBuild displays a warning and is a no-op.
 *
 * The output path is expected to be a relative path and defaults to "out.binpb".
 */
export const bufBuild = new Command(
  "buf.build",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!vscode.workspace.workspaceFolders) {
      log.warn(`No workspace found, unable to run "buf build".`);
      return;
    }
    const recommendedOutPath = "out.binpb";
    const outPath = await vscode.window.showInputBox({
      placeHolder: recommendedOutPath,
      prompt: `Provide an output path for "buf build", e.g. ${recommendedOutPath}. If none is provided, then "buf build" will output to /dev/null.`,
    });
    const args = ["build"];
    if (outPath) {
      args.push("-o", outPath);
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      bufState.execBufCommand(args, workspaceFolder.uri.fsPath);
    }
  }
);
