import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import { Command, CommandType, loadBufModules, restartBuf } from ".";
import { install } from "./install-buf";
import { log } from "../util";
import { BufVersion } from "../version";

export const updateBuf = new Command(
  "buf.update",
  CommandType.COMMAND_SETUP,
  (ctx, bufCtx) => {
    return async () => {
      if (!bufCtx.buf) {
        log.error("Buf is not installed. Please install Buf.");
        return;
      }

      // Gather all the version information to see if there's an upgrade.
      try {
        log.info("Checking for buf update...");
        var release = await github.latestRelease();
        var asset = await github.findAsset(release); // Ensure a binary for this platform.
        var upgrade = await bufCtx.buf?.hasUpgrade(release);
      } catch (e) {
        log.info(`Failed to check for buf update: ${e}`);

        // We're not sure whether there's an upgrade: stay quiet unless asked.
        vscode.window.showErrorMessage(`Failed to check for buf update: ${e}`);
        return;
      }

      log.info(
        `buf update: available=${upgrade.upgrade} installed=${upgrade.old}`
      );
      // Bail out if the new version is better or comparable.
      if (!upgrade.upgrade) {
        vscode.window.showInformationMessage(
          `buf is up-to-date (you have ${upgrade.old}, latest is ${upgrade.new})`
        );
        return;
      }

      const abort = new AbortController();
      const message =
        "An updated buf cli is available.\n " +
        `Would you like to upgrade to cli ${upgrade.new}? ` +
        `(from ${upgrade.old})`;
      const update = `Install cli ${upgrade.new}`;
      const dontCheck = "Don't ask again";

      const response = await vscode.window.showInformationMessage(
        message,
        update,
        dontCheck
      );
      if (response === update) {
        const bufPath = await install(ctx, release, asset, abort);
        vscode.window.showInformationMessage(
          `Buf ${release.name} is now installed.`
        );

        bufCtx.buf = await BufVersion.fromPath(bufPath);
        await restartBuf.execute();
        loadBufModules.execute();
      } else if (response === dontCheck) {
        config.update("checkUpdates", false, vscode.ConfigurationTarget.Global);
      }
    };
  }
);
