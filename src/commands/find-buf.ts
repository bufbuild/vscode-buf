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
//   1. If the user has set the buf.commandLine.path in the settings, use that.
//   2. If the user has set buf.commandLine.version, look for it in the extension storage.
//   3. Search for an installed buf binary in the extension storage.
//   4. Search for an installed buf binary in the PATH.
//   5. Finally, fallout with an error, the user can decide what they want to do.
export const findBuf = new Command(
  "buf.findBinary",
  CommandType.COMMAND_INTERNAL,
  (ctx, bufCtx) => {
    return async () => {
      const configPath = config.get<string>("commandLine.path");
      if (configPath) {
        bufCtx.buf = await BufVersion.fromPath(configPath);

        if (bufCtx.buf) {
          log.info(
            `Using '${bufCtx.buf.path}', version: ${bufCtx.buf.version}.`
          );
        } else {
          vscode.window.showErrorMessage(
            `Buf path is set to ${configPath}, but it is not a valid binary.`
          );
        }
        return;
      }

      // If we didn't get a valid buf binary from config...
      log.info("Looking for an already installed buf...");

      try {
        bufCtx.buf = await findBufInStorage(ctx);

        if (bufCtx.buf) {
          log.info(
            `Using '${bufCtx.buf.path}', version: ${bufCtx.buf.version}.`
          );
          return;
        }
      } catch (e) {
        log.error(`Error finding an installed buf: ${unwrapError(e)}`);
      }

      if (!bufCtx.buf && config.get<string>("commandLine.version")) {
        return;
      }

      // If we didn't find it in storage...
      try {
        bufCtx.buf = await findBufInPath();

        if (bufCtx.buf) {
          log.info(
            `Using '${bufCtx.buf.path}', version: ${bufCtx.buf.version}.`
          );
          return;
        }
      } catch (e) {
        log.error(`Error finding an installed buf: ${unwrapError(e)}`);
      }

      // If we made it to this point, we found nothing, throw an error.
      log.error(
        "Buf is not installed or no valid binary could be found. Please install Buf."
      );
    };
  }
);

const findBufInPath = async (): Promise<BufVersion | undefined> => {
  const bufPath = await which(bufFilename, { nothrow: true });

  if (bufPath) {
    return BufVersion.fromPath(bufPath);
  }

  return undefined;
};

const findBufInStorage = async (
  ctx: vscode.ExtensionContext
): Promise<BufVersion | undefined> => {
  const files = await fs.promises.readdir(ctx.globalStorageUri.fsPath);
  const version = config.get<string>("commandLine.version");

  let found: string | undefined;

  if (version) {
    found = files.find((f) => f.localeCompare(version) === 0);
  } else {
    found = files
      .filter((f) => f.startsWith("v"))
      .sort()
      .at(-1);
  }

  if (found) {
    return BufVersion.fromPath(
      path.join(ctx.globalStorageUri.fsPath, found, bufFilename)
    );
  }

  return undefined;
};
