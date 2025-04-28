import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import { restartBuf, updateBuf } from ".";
import { bufFilename, installURL } from "../const";
import { log } from "../log";
import { showHelp } from "../ui";
import { download } from "../util";
import { BufVersion } from "../version";
import { Command, CommandType } from "./command";

export const installBuf = new Command(
  "buf.install",
  CommandType.COMMAND_SETUP,
  (ctx, bufCtx) => {
    return async () => {
      // If 'buf.commandLine.path' is set explicitly, we don't want to do anything.
      if (config.get<string>("commandLine.path")) {
        vscode.window.showErrorMessage(
          "'buf.commandLine.path' is explicitly set. Please remove it to allow the extension to manage Buf."
        );
        return;
      }

      if (bufCtx.buf) {
        // Assume the user wants to attempt an upgrade...
        await updateBuf.execute();
        return;
      }

      const abort = new AbortController();
      try {
        const version = config.get<string>("commandLine.version");
        log.info(`Checking github releases for '${version}' release...`);
        const release = await github.getRelease(
          version === "latest" ? undefined : version
        );
        const asset = await github.findAsset(release);

        const bufPath = await install(ctx, release, asset, abort);

        bufCtx.buf = await BufVersion.fromPath(bufPath);
        vscode.window.showInformationMessage(
          `Buf ${release.name} is now installed.`
        );

        await restartBuf.execute();
      } catch (e) {
        if (!abort.signal.aborted) {
          log.info(`Failed to install buf: ${e}`);

          const message = `Failed to install Buf cli: ${e}\nYou may want to install it manually.`;
          showHelp(message, installURL);
        }
      }
    };
  }
);

export const install = async (
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

  await download(asset.browser_download_url, downloadBin, abort);

  await fs.promises.chmod(downloadBin, 0o755);

  return downloadBin;
};
