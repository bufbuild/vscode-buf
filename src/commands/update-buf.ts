import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";
import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import { startBuf } from ".";
import { Command } from "./command";
import { bufFilename } from "./install-buf";
import { log } from "../log";
import { bufState } from "../state";
import { BufVersion } from "../version";

const installURL = "https://buf.build/docs/cli/installation/";

/**
 * updateBuf updates the Buf CLI for the extension based on the extension configuration.
 *
 * The version is specified by the buf.commandLine.version configuration.
 *
 * updateBuf will download and install the configured version of the Buf CLI if there is
 * currently no version of the Buf CLI used by the extension or if the current version used
 * does not match the configured version.
 *
 * If an explicit path to the Buf CLI binary is specified via buf.commandLine.path, then
 * updateBuf displays a warning and is a no-op.
 *
 * If no version is set, then updateBuf displays a warning and is a no-op.
 *
 * If the version set is not valid semver, then updateBuf displays a warning and is a no-op.
 *
 * If the version set cannot be resolved, then updateBuf will provide the user with a pop-up
 * with the error message and a link to the installation docs.
 *
 * Once the Buf CLI version has been updated, then updateBuf will attempt to start the LSP server.
 */
export const updateBuf = new Command(
  "buf.update",
  "COMMAND_TYPE_SETUP",
  async (ctx) => {
    if (config.get<string>("commandLine.path")) {
      vscode.window.showErrorMessage(
        "'buf.commandLine.path' is explicitly set, no updates will be made."
      );
      return;
    }
    const configVersion = config.get<string>("commandLine.version");
    if (configVersion === "") {
      vscode.window.showErrorMessage(
        "'buf.commandLine.version' is not set, no updates will be made."
      );
      return;
    }
    if (configVersion !== "latest") {
      if (!semver.valid(configVersion)) {
        log.error(
          `buf.commandLine.version '${configVersion}' is not a valid semver version, no updates installed for Buf CLI...`
        );
        return;
      }
    }
    if (bufState.buf && configVersion !== "latest") {
      // The current running version matches the configured version, we can return here.
      if (bufState.buf.version.compare(configVersion) === 0) {
        log.info(`Already installed Buf CLI version '${configVersion}',`);
        await startBuf.execute();
        return;
      }
    }
    const abort = new AbortController();
    try {
      log.info(`Checking github releases for '${configVersion}' release...`);
      const release = await github.getRelease(configVersion);
      const asset = await github.findAsset(release);
      const bufPath = await installReleaseAsset(ctx, release, asset, abort);
      bufState.buf = await BufVersion.fromPath(bufPath);
      vscode.window.showInformationMessage(
        `Buf ${release.name} is now installed.`
      );
      await startBuf.execute();
    } catch (e) {
      if (!abort.signal.aborted) {
        log.info(`Failed to install buf: ${e}`);
        bufState.buf = undefined;
        bufState.languageServerStatus = "LANGUAGE_SERVER_NOT_INSTALLED";
        showPopup(
          `Failed to install Buf CLI. You may want to install it manually.`,
          installURL
        );
      }
    }
  }
);

/**
 * A helper for installing the specified GitHub release and asset.
 */
const installReleaseAsset = async (
  ctx: vscode.ExtensionContext,
  release: github.Release,
  asset: github.Asset,
  abort: AbortController
): Promise<string> => {
  const downloadDir = path.join(ctx.globalStorageUri.fsPath, release.tag_name);
  await fs.promises.mkdir(downloadDir, { recursive: true });
  const downloadBin = path.join(downloadDir, bufFilename);
  try {
    // Check the binary exists.
    await fs.promises.access(downloadBin);
    // Check we can execute the binary and determine its version.
    await BufVersion.fromPath(downloadBin);
    // If we made it to this point, the binary is valid, reuse it.
    return downloadBin;
  } catch {
    // Ignore errors, we will download it.
  }
  // If we've fallen out here.. lets proceed to download.
  log.info(`Downloading ${asset.name} to ${downloadBin}...`);
  await github.download(asset, downloadBin, abort);
  await fs.promises.chmod(downloadBin, 0o755);
  return downloadBin;
};

/**
 * A helper for showing a pop-up message to the user.
 */
async function showPopup(message: string, url: string) {
  if (await vscode.window.showInformationMessage(message, "Open website")) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
}
