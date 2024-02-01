import * as path from "path";
import * as vscode from "vscode";

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
  const binaryPath = vscode.workspace
    .getConfiguration("buf")!
    .get<string>("binaryPath");
  if (binaryPath === undefined) {
    console.log("buf binary path was not set");
    return {};
  }
  return {
    cwd: workspaceFolderFsPath,
    binaryPath: binaryPath.startsWith(".")
      ? path.join(workspaceFolderFsPath, binaryPath)
      : binaryPath,
  };
};
