import * as path from "path";
import * as vscode from "vscode";
import { existsSync } from "fs";
import pkg from "../package.json";

const defaultBinaryPath =
  pkg.contributes.configuration.properties["buf.binaryPath"].default;

const getWorkspaceFolderFsPath = () => {
  const outputChannel = vscode.window.createOutputChannel("Buf", "console");
  if (vscode.workspace.workspaceFolders === undefined) {
    outputChannel.appendLine("workspace folders was undefined");
    outputChannel.show();
    return;
  }
  if (vscode.workspace.workspaceFolders.length === 0) {
    outputChannel.appendLine("workspace folders was not set");
    outputChannel.show();
    return;
  }
  const uri = vscode.workspace.workspaceFolders[0].uri;
  if (uri.scheme !== "file") {
    outputChannel.appendLine(`uri was not file: ${uri.scheme}`);
    outputChannel.show();
    return;
  }
  return uri.fsPath;
};

export const getBinaryPath = () => {
  const outputChannel = vscode.window.createOutputChannel("Buf", "console");
  const workspaceFolderFsPath = getWorkspaceFolderFsPath();
  if (workspaceFolderFsPath === undefined) {
    return {};
  }
  let binaryPath = vscode.workspace
    .getConfiguration("buf")!
    .get<string>("binaryPath");
  if (binaryPath === undefined) {
    outputChannel.appendLine("buf binary path was not set");
    outputChannel.show();
    return {};
  }

  if (!path.isAbsolute(binaryPath) && binaryPath !== defaultBinaryPath) {
    // check if file exists
    binaryPath = path.join(workspaceFolderFsPath, binaryPath);

    if (!existsSync(binaryPath)) {
      outputChannel.appendLine(`buf binary path does not exist: ${binaryPath}`);
      outputChannel.show();
      return {};
    }
  }
  return {
    cwd: workspaceFolderFsPath,
    binaryPath,
  };
};
