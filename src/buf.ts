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

import * as child from "child_process";
import * as lsp from 'vscode-languageclient/node';
import * as vscode from "vscode";

import { Binary, Installer } from "./binary";
import { Error, Result } from "./error";

export class Context extends vscode.Disposable {
  subscriptions: vscode.Disposable[] = [];

  installer!: Installer;
  binary!: Binary;
  output!: vscode.OutputChannel;
  client!: lsp.LanguageClient;

  status!: {
    health: "ok" | "warning" | "error" | "stopped";
    message?: string;
    ongoing: Set<number | string>;
  };
  statusItem!: vscode.StatusBarItem;

  async activate(output: vscode.OutputChannel, storageDir: string) {
    this.output = output;
    this.installer = new Installer(storageDir);

    while (true) {
      let binary = await this.installer.get();
      if (binary instanceof Error) {
        await vscode.window.showErrorMessage(`${binary}`);
        continue;
      }
      
      this.binary = binary;
      break;
    }
    console.log(`obtained binary: ${this.binary.path}`);

    let buflsp: lsp.Executable = {
      command: this.binary.path,
      transport: lsp.TransportKind.pipe,
      args: [
        '--debug', // This will get dumped into the output pane.
        '--timeout', '0',
        '--log-format', 'text',
        'beta', 'lsp',
      ],
      options: {
        cwd: this.binary.cwd,
      },
    };

    let client: lsp.LanguageClientOptions = {
      documentSelector: [{
        scheme: 'file',
        language: 'proto',
      }],
      outputChannel: output,
      // Do not switch to output window when buf lsp returns output.
      revealOutputChannelOn: lsp.RevealOutputChannelOn.Error,
    };

    this.client = new lsp.LanguageClient("Buf Language Server", buflsp, client);
    this.status = {
      health: "stopped",
      ongoing: new Set(),
    };

    this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.statusItem.name = "Buf Language Server";
    this.subscriptions.push(this.statusItem);

    this.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => this.updateStatus()));
    this.subscriptions.push(this.client.onDidChangeState((_) => {
      if (this.client.state === lsp.State.Stopped) {
        this.status.health = "stopped";
        this.status.message = "Server is currently not running.";
      } else {
        this.status.health = "ok";
      }
      this.status.ongoing.clear();

      this.updateStatus();
    }));
    this.subscriptions.push(this.client.onNotification("$/progress", (params) => {
      switch (params.value.kind) {
        case "begin":
          this.status.ongoing.add(params.token);
          break;
        case "end":
          this.status.ongoing.delete(params.token);
          break;
      }

      this.updateStatus();
    }));

    await this.client.start();
    console.log('Buf Language Server is now active!');
  }

  clientError(error: Error) {
    this.output.append(`CLIENT ERROR ${error.message}\n`);
  }

  updateStatus() {
    let current = vscode.window.activeTextEditor?.document;
    if (!current || current.uri.scheme === "output") {
      return;
    }

    this.statusItem.show();
    this.statusItem.tooltip = new vscode.MarkdownString("", true);
    this.statusItem.tooltip.isTrusted = true;

    let icon: string | undefined = undefined;
    this.statusItem.command = "buf.outputPanel";
    switch (this.status.health) {
      case "ok":
        this.statusItem.color = undefined;
        this.statusItem.backgroundColor = undefined;
        icon = "pass";
        break;
      case "warning":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.warningForeground");
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        icon = "warning";
        break;
      case "error":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.errorForeground");
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        icon = "error";
        break;
      case "stopped":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.warningForeground");
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        this.statusItem.command = "buf.restartServer";
        icon = "warning";
        break;
    }

    if (this.status.message) {
      this.statusItem.tooltip.appendText(this.status.message);
      this.statusItem.tooltip.appendMarkdown("\n\n---\n\n");
    }

    this.statusItem.tooltip.appendMarkdown(
      "[$(terminal) Reveal Server Output](command:buf.outputPanel)\n\n" +
      "[$(debug-stop) Stop Server](command:buf.stopServer)\n\n" +
      "[$(debug-restart) Restart Server](command:buf.restartServer)\n\n" +
      "---\n\nBuf Language Server " + this.binary.version()
    );

    if (this.status.health !== "stopped" && this.status.ongoing.size > 0) {
      icon = "loading~spin";
    }

    this.statusItem.text = `$(${icon}) Buf`;
  }

  starting(): boolean {
    return this.client && this.client.state === lsp.State.Starting;
  }

  dispose() {
    this.subscriptions.forEach((d) => { d.dispose(); });
    if (this.client) {
      this.client.stop();
    }
    this.subscriptions = [];
  }
}

export const lint = (
  binaryPath: string,
  filePath: string,
  cwd: string
): Result<string[]> => {
  const output = child.spawnSync(
    binaryPath,
    ["lint", filePath + "#include_package_files=true", "--error-format=json"],
    {
      encoding: "utf-8",
      cwd: cwd,
      shell: process.platform === "win32",
    }
  );
  if (output.error !== undefined) {
    return new Error(output.error.message);
  }
  if (output.status !== null && output.status === 0) {
    return [];
  }
  return output.stdout.trim().split("\n");
};