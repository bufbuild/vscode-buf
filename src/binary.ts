// Copyright 2020-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as child from 'child_process';
import * as config from "./config";
import * as fetch from "./fetch";
import * as fs from "fs";
import * as github from "./github";
import * as os from 'os';
import * as path from "path";
import * as semver from 'semver';
import * as stream from 'stream';
import * as tar from 'tar-fs';
import * as vscode from "vscode";

import { Error, Result } from "./error";

import {AbortController} from 'abort-controller';
import {default as gunzip} from 'gunzip-maybe';
import { promisify } from 'util';

// This is the earliest version that has buf lsp support.
const minVersion = 'v1.43.0';

/**
 * A located Buf CLI binary.
 */
export class Binary {
  cwd: string;
  path: string;
  constructor(cwd: string, path: string) {
    this.cwd = cwd;
    this.path = path;
  }

  version(): Result<string> {
    let output = child.spawnSync(this.path, ["--version"], {
      cwd: this.cwd,
      encoding: "utf-8",
      shell: process.platform === "win32",
    });

    if (output.error !== undefined) {
      return new Error(output.error.message);
    }

    if (output.stderr.trim() !== "") {
      return new Error(output.stderr.trim());
    } else {
      return output.stdout.trim();
    }
  } 
}

export class Installer {
  storageDir: string;
  dontAsk: boolean = false;

  constructor(globalStoragePath: string) {
    this.storageDir = globalStoragePath;
  }

  async get(): Promise<Result<Binary>> {
    let binaryPath = vscode.workspace.getConfiguration()!.get<string>(config.cliPath);

    let isManaged = false;
    if (!binaryPath) {
      isManaged = true;
      binaryPath = this.bundledPath();
    }

    let workspace = findWorkspacePath();
    if (workspace instanceof Error) {
      return new Error(`Could not find workspace: ${workspace}`);
    }
    let buf = new Binary(workspace, binaryPath);

    let version = buf.version();
    if (!(version instanceof Error)) {
      if (!isManaged && semver.lt(version, minVersion)) {
        return new Error(`Detected installed Buf CLI ${version}, which does not support LSP.\nSee https://buf.build/docs/installation for installation instructions.`);
      } else if (isManaged) {
        // Run this asynchronously. This avoids blocking startup on doing an an
        // HTTP GET to GitHub's API.
        this.checkForUpdates(version).then((result) => {
          if (result instanceof Error) {
            vscode.window.showErrorMessage(`${result}`);
          }
        });
      }
      return buf;
    }

    // Switch over to managed mode, because we couldn't find an installed `buf`.
    if (!isManaged) {
      buf.path = this.bundledPath();
    }

    // Need to block here.
    let result = await this.checkForUpdates();
    if (result instanceof Error) {
      return new Error(`Failed to update installed Buf CLI: ${result}`);
    }
    return buf;
  }

  async checkForUpdates(current?: string): Promise<Result<void>> {    
    let release = await github.release('bufbuild', 'buf', 'latest');
    if (release instanceof Error) {
      return release;
    }
    let latest = release.tag_name; 

    let checkForUpdates = vscode.workspace.getConfiguration()!.get<string>(config.cliUpdates);

    if (!current) {
      let text = `The Buf CLI could not be found on your PATH.\nWould you like to download and install buf ${latest}`;
      if(await vscode.window.showInformationMessage(text, `Install buf ${latest}`)) {
        return this.install(release);
      }
    } else if (semver.lt(current, latest) && checkForUpdates) {
      let text = `A new version of the Buf CLI is available. Would you like to upgrade? ${current} -> ${latest}`;
      let update = `Install buf ${latest}`;
      let dontCheck = "Don't ask again";
      
      return vscode.window.showInformationMessage(text, update, dontCheck).then(async (choice) => {
        switch (choice) {
          case update:
            let result = await this.install(release);
            if (result instanceof Error) {
              return result;
            }

            let text = `A new version of the Buf CLI (${latest}) has been installed.`;
            if (await vscode.window.showInformationMessage(text, "Restart Language Server")) {
              vscode.commands.executeCommand("buf.restartServer");
            }
            break;
          case dontCheck:
            vscode.workspace.getConfiguration()!.update(config.cliUpdates, false, vscode.ConfigurationTarget.Global);
            break;
        }
        return;
      });
    }
  }

  private async install(release: github.Release): Promise<Result<void>> {
    let platform = getPlatform();
    if (platform instanceof Error) {
      return platform;
    }
    let name = `buf-${platform}.tar.gz`;
    let asset;
    for (let blob of release.assets) {
      if (blob.name === name) {
        asset = blob;
        break;
      }
    }
    if (!asset) {
      return new Error(`Could not find ${platform} among release assets for ${release.tag_name}`);
    }

    // Download the tarball into the temporary downloads directory.
    let tarball = path.join(this.storageDir, `buf-${release.name}-${platform}.tar.gz`);
    if (!fs.existsSync(tarball)) {
      // Don't bother downloading if we've already got that version. This is
      // primarily to aid e.g. offline testing.
      fs.mkdirSync(this.storageDir, { recursive: true });
      let result = await fetch.download(asset.browser_download_url, tarball, new AbortController());
      if (result instanceof Error) {
        return result;
      }
    }

    // Extract the tarfile into the install directory.
    try {
      let extracted = path.join(this.storageDir, `buf-${release.name}`);
      let target = path.join(this.storageDir, 'bin');
      await promisify(stream.pipeline)(
        fs.createReadStream(tarball),
        gunzip(),
        tar.extract(extracted),
      );
      
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      fs.symlinkSync(path.join(extracted, 'buf/bin'), target);
    } catch (e) {
      return new Error(`Failed to extract ${tarball}: ${e}`);
    }
  }

  private bundledPath(): string {
    return path.join(this.storageDir, 'bin/buf');
  }
  private tarballPath(): string {
    return path.join(this.storageDir, 'buf.tar.gz');
  }
}

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

function getPlatform(): Result<string> {
  let osName, archName;
  switch (os.platform()) {
    case "linux":
      osName = "Linux";
      break;
    case "darwin":
      osName = "Darwin";
      break;
    case "win32":
      osName = "Windows";
      break;
  }
  switch (os.arch()) {
    case "x64":
      archName = "x86_64";
      break;
    case "arm64":
      archName = osName === "Linux" ? "aarch64": "arm64";
      break;
  }

  if (!osName || !archName) {
    return new Error(`Unsupported platform: ${os.platform()}-${os.arch()}.`);
  }

  return `${osName}-${archName}`;
}