import * as vscode from "vscode";
import { log } from "../log";
import { bufState } from "../state";
import { execFile } from "../util";
import { Command } from "./command";

/**
 * bufConfigLsBreakingRules runs `buf config ls-breaking-rules` and shows the output in a
 * text document window.
 */
export const bufConfigLsBreakingRules = new Command(
  "buf.configlsbreakingrules",
  "COMMAND_TYPE_BUF",
  async () => {
    const bufBinaryPath = bufState.getBufBinaryPath();
    try {
      const { stdout, stderr } = await execFile(bufBinaryPath ?? "", [
        "config",
        "ls-breaking-rules",
      ]);
      if (stderr) {
        log.error(`Error executing "buf config ls-breaking-rules": ${stderr}`);
      }
      const document = await vscode.workspace.openTextDocument({
        content: stdout,
        language: "plainText",
      });
      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Active,
        preview: true,
      });
    } catch (e) {
      log.error(`Error executing "buf config ls-breaking-rules": ${e}`);
    }
  }
);
