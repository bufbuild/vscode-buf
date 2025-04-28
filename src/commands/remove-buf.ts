import * as fs from "fs";
import * as vscode from "vscode";

import { findBuf, restartBuf } from ".";
import { unwrapError } from "../errors";
import { log } from "../log";
import { Command, CommandType } from "./command";

export const removeBuf = new Command(
  "buf.remove",
  CommandType.COMMAND_SETUP,
  (ctx, _) => {
    return async () => {
      const versions = ["All"];

      const verDirs = (await fs.promises.readdir(ctx.globalStorageUri.fsPath))
        .filter((f) => f.startsWith("v"))
        .sort();

      versions.push(...verDirs);

      const versionToRemove = await vscode.window.showInformationMessage(
        "Which buf versions do you want to remove?",
        ...versions
      );

      if (!versionToRemove) {
        return;
      } else if (versionToRemove === "All") {
        const confirm = await vscode.window.showWarningMessage(
          "Are you sure you want to remove all buf versions?",
          { modal: true },
          "Yes",
          "No"
        );

        if (confirm !== "Yes") {
          return;
        }

        log.info("Removing all buf versions...");
        await removeVersions(ctx, ...verDirs);
      } else {
        log.info(`Removing buf version ${versionToRemove}...`);
        await removeVersions(ctx, versionToRemove);
      }

      await findBuf.execute();
      restartBuf.execute();
    };
  }
);

const removeVersions = async (
  ctx: vscode.ExtensionContext,
  ...versions: string[]
) => {
  try {
    for (const ver of versions) {
      await fs.promises.rm(`${ctx.globalStorageUri.fsPath}/${ver}`, {
        recursive: true,
      });
    }
  } catch (e) {
    log.error(`Failed to remove buf versions: ${unwrapError(e)}`);
  }
};
