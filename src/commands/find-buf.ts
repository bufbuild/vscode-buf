import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";

import which from "which";
import { Command, CommandType } from ".";
import { bufFilename } from "../const";
import { unwrapError } from "../errors";
import { log } from "../log";
import { BufVersion } from "../version";

// This command is used to find the buf binary and set it in the context.
// Order of precedence:
//   1. If the user has set the buf.path in the settings, use that.
//   2. Search for an installed buf binary in the extension storage.
//   3. Search for an installed buf binary in the PATH.
//   4. Finally, fallout with an error, the user can decide what they want to do.
export const findBuf = new Command(
  "buf.findBinary",
  CommandType.COMMAND_INTERNAL,
  (ctx, bufCtx) => {
    return async () => {
      let buf: BufVersion | null = null;

      const configPath = config.get<string>("commandLine.path");
      if (configPath) {
        buf = await BufVersion.fromPath(configPath);

        vscode.window.showErrorMessage(
          `Buf path is set to ${buf.path}, but it is not a valid binary. Attempting to locate a valid binary...`
        );
      }

      // If we didn't get a valid buf binary from config...
      if (!buf) {
        log.info("Looking for an already installed buf...");

        try {
          buf = await findBufInStorage(ctx);
        } catch (e) {
          log.error(`Error finding an installed buf: ${unwrapError(e)}`);
        }
      }

      // If we didn't find it in storage...
      if (!buf) {
        try {
          buf = await findBufInPath();
        } catch (e) {
          log.error(`Error finding an installed buf: ${unwrapError(e)}`);
        }
      }

      if (!buf) {
        log.error(
          "Buf is not installed or no valid binary could be found. Please install Buf."
        );
        return;
      }

      bufCtx.buf = buf;
      log.info(`Using '${buf.path}', version: ${buf.version}.`);
    };
  }
);

const findBufInPath = async (): Promise<BufVersion | null> => {
  const bufPath = await which(bufFilename, { nothrow: true });

  if (bufPath) {
    return BufVersion.fromPath(bufPath);
  }

  return null;
};

const findBufInStorage = async (
  ctx: vscode.ExtensionContext
): Promise<BufVersion | null> => {
  const files = await fs.promises.readdir(ctx.globalStorageUri.fsPath);

  const latest = files
    .filter((f) => f.startsWith("v"))
    .sort()
    .at(-1);

  if (latest) {
    return BufVersion.fromPath(
      path.join(ctx.globalStorageUri.fsPath, latest, bufFilename)
    );
  }

  return null;
};
