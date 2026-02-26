import * as cp from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

/**
 * @file Provides shared helpers for the extension.
 */

/**
 * Wraps {@link cp.execFile} into an async call.
 */
export const execFile = promisify(cp.execFile);

/**
 * Expands VS Code variables in a path string for the given workspace folder.
 *
 * Supports:
 * - `${workspaceFolder}` / `${workspaceRoot}` — replaced with the workspace folder path
 * - `${workspaceFolderBasename}` — replaced with the basename of the workspace folder
 * - `~` at the start of the path — replaced with the user's home directory
 */
export function expandPathVariables(
  configPath: string,
  workspaceFolder: string
): string {
  return configPath
    .replace(/\$\{workspaceFolder\}|\$\{workspaceRoot\}/g, workspaceFolder)
    .replace(/\$\{workspaceFolderBasename\}/g, path.basename(workspaceFolder))
    .replace(/^~/, os.homedir());
}
