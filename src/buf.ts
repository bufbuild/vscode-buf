import * as child_process from "child_process";
import * as fs from "fs";
import * as lsp from 'vscode-languageclient/node';
import * as path from 'path';
import * as vscode from "vscode";

import { Error, Result } from "./error";

import { Binary } from "./binary"
import { Version } from "./version";
import pkg from "../package.json";

export class Context extends vscode.Disposable {
  subscriptions: vscode.Disposable[] = [];

  binary!: Binary;
  version!: Version;
  output!: vscode.OutputChannel;
  client!: lsp.LanguageClient;

  status!: {
    health: "ok" | "warning" | "error" | "stopped";
    message?: string;
    ongoing: Set<number | string>;
  };
  statusItem!: vscode.StatusBarItem;

  async activate(output: vscode.OutputChannel) {
    this.output = output;

    let binary = Binary.find();
    if (binary instanceof Error) {
      this.clientError(binary);
      return;
    }
    this.binary = binary;

    let curVersion = this.findVersion();
    if (curVersion instanceof Error) {
      this.output.append(`error checking buf version: ${curVersion.message}`);
      return;
    }

    if (curVersion.olderThan(minVersion)) {
      vscode.window
        .showErrorMessage(
          `This version of vscode-buf requires at least version ${minVersion.toString()} of buf.
            You are currently on version ${curVersion.toString()}.`,
          "Go to download page"
        )
        .then((selection: string | undefined) => {
          if (selection === undefined || selection !== "Go to download page") {
            return;
          }

          vscode.env.openExternal(vscode.Uri.parse(downloadPage));
        });

      return;
    }
    this.version = curVersion;

    let buflsp: lsp.Executable = {
      command: binary.path,
      transport: lsp.TransportKind.pipe,
      args: [
        '--debug', // This will get dumped into the output pane.
        '--timeout', '10000000m',
        '--log-format', 'text',
        'beta', 'lsp',
      ],
      options: {
        cwd: binary.cwd,
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
      if (this.client.state == lsp.State.Stopped) {
        this.status.health = "stopped";
        this.status.message = "Server is currently not running."
      } else {
        this.status.health = "ok";
      }
      this.status.ongoing.clear();

      this.updateStatus()
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
    }))

    this.client.start();
    console.log('Buf Language Server is now active!');
  }

  clientError(error: Error) {
    this.output.append(`CLIENT ERROR ${error.message}\n`);
  }

  updateStatus() {
    let current = vscode.window.activeTextEditor?.document;
    if (!current || current.uri.scheme === "output") {
      return
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
        icon = "pass"
        break;
      case "warning":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.warningForeground")
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground")
        icon = "warning";
        break;
      case "error":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.errorForeground")
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")
        icon = "error";
        break;
      case "stopped":
        this.statusItem.color = new vscode.ThemeColor("statusBarItem.warningForeground")
        this.statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")
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
      "---\n\nBuf Language Server " + this.version
    );

    if (this.status.health != "stopped" && this.status.ongoing.size > 0) {
      icon = "loading~spin";
    }

    this.statusItem.text = `$(${icon}) Buf`;
  }

  findVersion(): Result<Version> {
    let output = child_process.spawnSync(this.binary.path, ["--version"], {
      encoding: "utf-8",
      shell: process.platform === "win32",
    });

    if (output.error !== undefined) {
      return new Error(output.error.message)
    }
    if (output.stderr.trim() !== "") {
      return Version.parse(output.stderr.trim());
    }
    return Version.parse(output.stdout.trim());
  }

  starting(): boolean {
    return this.client && this.client.state == lsp.State.Starting;
  }

  dispose() {
    this.subscriptions.forEach((d) => { d.dispose(); });
    if (this.client) {
      this.client.stop();
    }
    this.subscriptions = []
  }
}

// 1.0.0-rc6 is when we added the proto file input reference
// https://github.com/bufbuild/buf/releases/tag/v1.0.0-rc6
const minVersion = new Version(1, 0, 0, 6);
const downloadPage = "https://docs.buf.build/installation";

export const lint = (
  binaryPath: string,
  filePath: string,
  cwd: string
): Result<string[]> => {
  const output = child_process.spawnSync(
    binaryPath,
    ["lint", filePath + "#include_package_files=true", "--error-format=json"],
    {
      encoding: "utf-8",
      cwd: cwd,
      shell: process.platform === "win32",
    }
  );
  if (output.error !== undefined) {
    return new Error(output.error.message)
  }
  if (output.status !== null && output.status === 0) {
    return [];
  }
  return output.stdout.trim().split("\n");
};