import * as vscode from "vscode";

import { Command, CommandType } from "./command";
import { unwrapError } from "../errors";
import { log } from "../log";
import { execFile } from "../util";

export const bufGenerate = new Command(
  "buf.generate",
  CommandType.COMMAND_BUF,
  (_, bufCtx) => {
    return async () => {
      if (!bufCtx.buf) {
        log.error("Buf is not installed. Please install Buf.");
        return;
      }

      try {
        const { stdout, stderr } = await execFile(
          bufCtx.buf?.path,
          ["generate"],
          {
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
    };
  }
);
