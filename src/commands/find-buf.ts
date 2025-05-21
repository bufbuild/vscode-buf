import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import which from "which";
import { Command, CommandType } from "./command";
import { bufFilename } from "../const";
import { unwrapError } from "../errors";
import { log } from "../log";
import { BufVersion } from "../version";

// This command is used to find the buf binary and set it in the context.
// Order of precedence:
//   1. Allow the user to set the buf path in the config e.g. 'buf.commandLine.path: /usr/local/bin/buf'
//   2. Allow the extension to manage the buf version for the user and always update to the latest e.g. 'buf.commandLine.version: latest'
//   3. If the user has not set a path or version, we will look for buf in the OS path.
export const findBuf = new Command(
  "buf.findBinary",
  CommandType.COMMAND_INTERNAL,
  (ctx, bufCtx) => {
    return async () => {
      let configPath = config.get<string>("commandLine.path");
      const configVersion = config.get<string>("commandLine.version");

      if (configPath) {
        if (!path.isAbsolute(configPath)) {
          configPath = path.join(
            vscode.workspace.rootPath || process.cwd(), //todo: fix me in the future when we want to support multi-root workspaces
            configPath
          );
        }

        if (configVersion) {
          log.warn(
            "Both 'buf.commandLine.path' and 'buf.commandLine.version' are set. Using 'buf.commandLine.path'."
          );
        }

        try {
          log.info(`Buf path set to '${configPath}'.`);
          bufCtx.buf = await BufVersion.fromPath(configPath);

          if (bufCtx.buf) {
            log.info(
              `Using '${bufCtx.buf.path}', version: ${bufCtx.buf.version}.`
            );
          }
        } catch (e) {
          log.error(
            `Error loading buf from path '${configPath}': ${unwrapError(e)}`
          );
          bufCtx.buf = undefined;
        }

        return;
      }

      if (configVersion) {
        let version = configVersion;

        // Get the latest version from GitHub if the user has set it to "latest".
        if (configVersion === "latest") {
          const latestRelease = await github.getRelease();
          version = latestRelease.tag_name;
        }

        try {
          log.info(
            `Buf version set to '${configVersion}'. Looking for '${version}' in extension storage...`
          );
          bufCtx.buf = await getBufInStorage(ctx, version);

          if (bufCtx.buf) {
            log.info(
              `Using '${bufCtx.buf.path}', version: ${bufCtx.buf.version}.`
            );
          }
        } catch (e) {
          log.error(`Error finding an installed buf: ${unwrapError(e)}`);
          bufCtx.buf = undefined;
        }

        return;
      }

      // If we didn't get a valid buf binary from config...
      log.info("Looking for buf on the path...");

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

const getBufInStorage = async (
  ctx: vscode.ExtensionContext,
  version: string
): Promise<BufVersion | undefined> => {
  const bufPath = path.join(ctx.globalStorageUri.fsPath, version, bufFilename);

  // Check if the buf binary exists in the storage path.
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(bufPath));
  } catch {
    return undefined;
  }

  return await BufVersion.fromPath(bufPath);
};
