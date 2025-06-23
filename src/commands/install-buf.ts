import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";

import { startBuf, updateBuf } from ".";
import { Command } from "./command";
import { unwrapError } from "../errors";
import { log } from "../log";
import { bufState } from "../state";
import { BufVersion } from "../version";
import which from "which";

/**
 * The Buf CLI file name to check for in storage.
 */
export const bufFilename = os.platform() === "win32" ? "buf.exe" : "buf";

/**
 * installBuf installs the Buf CLI for the extension based on the extension configuration.
 *
 * There are two configuration fields for managing the Buf CLI binary:
 *  buf.commandLine.path: a path to a local binary, e.g. /usr/local/bin/buf
 *  buf.commandLine.version: the expected version of the Buf binary, e.g. v1.53.0. This can
 *  also be set to "latest", in which case, the extension will check for and expect the latest
 *  released version of the Buf CLI.
 *
 * When checking for the Buf CLI binary, the resolution logic uses the following order of
 * precendence:
 *  1. The path set on buf.commandLine.path.
 *  2. The version set to buf.commandLine.version. If "latest" is set, check for and use the
 *  latest released version of the Buf CLI.
 *  3. If neither buf.commandLine.path or buf.commandLine.version is set, look for the Buf
 *  CLI on the OS path.
 *
 * If the Buf CLI for the configured path is already installed, then installBuf logs this
 * and is a no-op.
 *
 * After installing the binary, installBuf will attempt to start the LSP server.
 */
export const installBuf = new Command(
  "buf.install",
  "COMMAND_TYPE_SETUP",
  async () => {
    let configPath = config.get<string>("commandLine.path");
    const configVersion = config.get<string>("commandLine.version");

    if (configPath) {
      if (!path.isAbsolute(configPath)) {
        // TODO: support multi-root workspaces, rootPath is deprecated.
        configPath = path.join(
          vscode.workspace.rootPath || process.cwd(),
          configPath
        );
      }
      if (configVersion) {
        log.warn(
          "Both 'buf.commandLine.path' and 'buf.commandLine.version' are set. Using 'buf.commandLine.path'."
        );
      }
      if (bufState.buf && bufState.buf.path === configPath) {
        log.info(
          `Buf CLI at for configured path '${configPath}' already installed`
        );
        return;
      }
      try {
        log.info(`Installing Buf CLI set to path '${configPath}...`);
        bufState.buf = await BufVersion.fromPath(configPath);
        if (bufState.buf) {
          log.info(
            `Using '${bufState.buf.path}', version: ${bufState.buf.version}.`
          );
        }
        await startBuf.execute();
      } catch (e) {
        log.error(
          `Error loading buf from path '${configPath}': ${unwrapError(e)}`
        );
        bufState.buf = undefined;
        bufState.languageServerStatus = "LANGUAGE_SERVER_NOT_INSTALLED";
      }
      return;
    }

    if (configVersion) {
      // Use updateBuf to upgrade
      await updateBuf.execute();
      return;
    }

    log.info("Looking for Buf on the OS path...");
    try {
      bufState.buf = await findBufInPath();
      if (bufState.buf) {
        log.info(
          `Using '${bufState.buf.path}', version: ${bufState.buf.version}.`
        );
        await startBuf.execute();
      }
    } catch (e) {
      log.error(`Buf is not installed on the OS path: ${e}`);
      bufState.buf = undefined;
      bufState.languageServerStatus = "LANGUAGE_SERVER_NOT_INSTALLED";
    }
  }
);

/**
 * A helper function for finding the Buf CLI on the system $PATH.
 */
const findBufInPath = async (): Promise<BufVersion | undefined> => {
  const bufPath = await which(bufFilename, { nothrow: true });
  if (bufPath) {
    return BufVersion.fromPath(bufPath);
  }
  return undefined;
};
