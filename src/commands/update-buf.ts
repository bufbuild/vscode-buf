import * as vscode from "vscode";
import * as config from "../config";
import * as github from "../github";

import { restartBuf } from ".";
import { ServerStatus } from "../context";
import { log } from "../log";
import { BufVersion, Upgrade } from "../version";
import { Command, CommandType } from "./command";
import { install } from "./install-buf";

export const updateBuf = new Command(
  "buf.update",
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

      if (!bufCtx.buf) {
        log.error("Buf is not installed. Please install Buf.");
        bufCtx.status = ServerStatus.SERVER_NOT_INSTALLED;
        return;
      }

      const version = config.get<string>("commandLine.version");
      if (version && version !== "latest") {
        log.info(`Buf set to version '${version}'. Skipping update.`);
        return;
      }

      let release: github.Release;
      let asset: github.Asset;
      let upgrade: Upgrade;

      // Gather all the version information to see if there's an upgrade.
      try {
        log.info("Checking for buf update...");
        release = await github.getRelease();
        asset = await github.findAsset(release); // Ensure a binary for this platform.
        upgrade = await bufCtx.buf?.hasUpgrade(release);
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
      } else if (response === dontCheck) {
        config.update("checkUpdates", false, vscode.ConfigurationTarget.Global);
      }
    };
  }
);
