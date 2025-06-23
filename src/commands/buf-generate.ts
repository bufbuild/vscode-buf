import * as vscode from "vscode";

import { Command } from "./command";
import { bufState } from "../state";
import { unwrapError } from "../errors";
import { log } from "../log";
import { execFile } from "../util";

/**
 * bufGenerate runs `buf generate` at the root of the VSCode workspace.
 */
export const bufGenerate = new Command(
  "buf.generate",
  "COMMAND_TYPE_BUF",
  async () => {
    if (!bufState.buf) {
      log.error("Buf is not installed. Please install Buf.");
      return;
    }

    try {
      const { stdout, stderr } = await execFile(
        bufState.buf?.path,
        ["generate"],
        {
          // TODO: support multi-root workspaces, rootPath is deprecated.
          cwd: vscode.workspace.rootPath,
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
);
