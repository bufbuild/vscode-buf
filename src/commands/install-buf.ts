import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import { Command, CommandType, loadBufModules, restartBuf, updateBuf } from ".";
import { bufFilename, installURL } from "../const";
import { showHelp } from "../ui";
import { download, log } from "../util";
import { BufVersion } from "../version";

export const installBuf = new Command(
  "buf.install",
  CommandType.COMMAND_SETUP,
  (ctx, bufCtx) => {
    return async () => {
      if (bufCtx.buf) {
        // If 'buf.path' is set explicitly, we don't want to do anything.
        if (config.get<string>("path")) {
          vscode.window.showErrorMessage(
            "'buf.path' is explicitly set. Please remove it to use the extension's bundled version."
          );
          return;
        }

        // Assume the user wants to attempt an upgrade...
        await updateBuf.execute();
        return;
      }

      const abort = new AbortController();
      try {
        log.info("Checking github releases for latest release...");
        const release = await github.latestRelease();
        const asset = await github.findAsset(release);

        const bufPath = await install(ctx, release, asset, abort);

        bufCtx.buf = await BufVersion.fromPath(bufPath);
        vscode.window.showInformationMessage(
          `Buf ${release.name} is now installed.`
        );

        await restartBuf.execute();
        loadBufModules.execute();
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
