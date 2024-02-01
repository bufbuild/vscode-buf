import * as path from "path";
import * as vscode from "vscode";
import { existsSync } from "fs";

const getWorkspaceFolderFsPath = () => {
  if (vscode.workspace.workspaceFolders === undefined) {
    console.log("workspace folders was undefined");
    return;
  }
  if (vscode.workspace.workspaceFolders.length === 0) {
    console.log("workspace folders was not set");
    return;
  }
  const uri = vscode.workspace.workspaceFolders[0].uri;
  if (uri.scheme !== "file") {
    console.log("uri was not file: ", uri.scheme);
    return;
  }
  return uri.fsPath;
};

export const getBinaryPath = () => {
  const workspaceFolderFsPath = getWorkspaceFolderFsPath();
  if (workspaceFolderFsPath === undefined) {
    return {};
  }
  let binaryPath = vscode.workspace
    .getConfiguration("buf")!
    .get<string>("binaryPath");
  if (binaryPath === undefined) {
    console.log("buf binary path was not set");
    return {};
  }
  const relative = binaryPath.startsWith(".");
  if (relative) {
    // check if file exists
    binaryPath = path.join(workspaceFolderFsPath, binaryPath);
    if (process.platform === "win32") {
      if (path.extname(binaryPath) === "" && !existsSync(binaryPath)) {
        // A common pattern with npm binaries
        binaryPath += ".exe";
      }
    }
    if (!existsSync(binaryPath)) {
      console.log("buf binary path does not exist: ", binaryPath);
      return {};
    }
  }
  return {
    cwd: workspaceFolderFsPath,
    binaryPath,
  };
};
