import * as vscode from "vscode";

import { Command, CommandType } from ".";
import { BufFile } from "../context";
import { unwrapError } from "../errors";
import { execFile, log } from "../util";

export const loadBufModules = new Command("buf.loadBufModules", CommandType.COMMAND_INTERNAL, (ctx, bufCtx) => {
  const callback = async () => {
    if (!bufCtx.buf) {
      log.error("Buf is not installed. Please install Buf.");
      return;
    }

    try {
      const { stdout, stderr } = await execFile(bufCtx.buf?.path, ["ls-files", "--format", "json"], {
        cwd: vscode.workspace.rootPath,
      });

      if (stderr) {
        log.error(`Error loading buf modules: ${stderr}`);
        return;
      }

      bufCtx.bufFiles.clear();

      for (const line of stdout.split("\n")) {
        if (!line) {
          continue;
        }

        const file = <BufFile>JSON.parse(line);

        if (file) {
          bufCtx.bufFiles.set(file.path, file);
        }
      }
    } catch (e) {
      log.error(`Error loading buf modules: ${unwrapError(e)}`);
    }
  };

  // Reload modules when buf.yaml changes on the filesystem..
  const watcher = vscode.workspace.createFileSystemWatcher("**/buf.yaml");
  watcher.onDidChange(callback);
  watcher.onDidCreate(callback);
  watcher.onDidDelete(callback);
  ctx.subscriptions.push(watcher);

  return callback;
});
