import * as vscode from "vscode";

import { Command } from "./command";
import { bufState } from "../state";
import { unwrapError } from "../errors";
import { log } from "../log";
import { execFile } from "../util";

/**
 * bufGenerate runs `buf generate` at the root of each VS Code workspace folder. If there
 * are no workspace folders, then `buf generate` executes in the current execution context.
 */
export const bufGenerate = new Command(
  "buf.generate",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!vscode.workspace.workspaceFolders) {
      await execBufGenerate(process.cwd());
      return;
    }
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      execBufGenerate(workspaceFolder.uri.path);
    }
  }
);

async function execBufGenerate(cwd: string) {
  if (!bufState.buf) {
    log.error("Buf is not installed. Please install Buf.");
    return;
  }
  try {
    const { stdout, stderr } = await execFile(
      bufState.buf?.path,
      ["generate"],
      {
        cwd: cwd,
      }
    );
    if (stderr) {
      log.error(`Error generating buf: ${stderr}`);
      return;
    }
    log.info(stdout);
  } catch (e) {
    log.error(`Error generating buf: ${unwrapError(e)}`);
  }
}
