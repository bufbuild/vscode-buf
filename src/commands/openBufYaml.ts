import * as vscode from "vscode";

import { Command, CommandType } from ".";
import { log } from "../util";

export const openBufYaml = new Command(
  "buf.openYaml",
  CommandType.COMMAND_EXTENSION,
  () => {
    return async () => {
      const files = await vscode.workspace.findFiles("buf.y*ml");

      if (files.length === 0) {
        log.warn("No buf.yaml file found in workspace.");
        return;
      }

      const doc = await vscode.workspace.openTextDocument(files[0]);
      await vscode.window.showTextDocument(doc);
    };
  }
);
