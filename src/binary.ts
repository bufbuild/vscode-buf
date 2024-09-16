import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { Error, Result } from "./error";

import pkg from "../package.json";

/**
 * A located Buf CLI binary.
 */
export class Binary {
  cwd: string
  path: string

  constructor(cwd: string, path: string) {
    this.cwd = cwd
    this.path = path
  }

  static find(defaultPath: string = defaultBinaryPath): Result<Binary> {
    let workspace = findWorkspacePath()
    if (workspace instanceof Error) {
      return workspace
    }

    let config = vscode.workspace.getConfiguration("buf");
    let binaryPath = config!.get<string>("binaryPath");
    if (binaryPath === undefined) {
      return new Error("Buf CLI path was not set");
    }
  
    if (!path.isAbsolute(binaryPath) && binaryPath !== defaultPath) {
      // Check if file exists.
      binaryPath = path.join(workspace, binaryPath);
      if (!fs.existsSync(binaryPath)) {
        return new Error(`Buf CLI does not exist: file not found: ${binaryPath}`);
      }
    }
    
    return new Binary(workspace, binaryPath)
  }
}

const defaultBinaryPath = pkg.contributes.configuration.properties["buf.binaryPath"].default;

export function findWorkspacePath(): Result<string> {
  if (vscode.workspace.workspaceFolders === undefined) {
    return new Error("workspace folders was undefined");
  }
  
  if (vscode.workspace.workspaceFolders.length === 0) {
    return new Error("workspace folders was not set");
  }
  
  let uri = vscode.workspace.workspaceFolders[0].uri;
  if (uri.scheme !== "file") {
    return new Error(`uri was not file: ${uri.scheme}`);
  }

  return uri.fsPath;
}
