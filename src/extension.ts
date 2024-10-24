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

import * as buf from "./buf";
import * as lsp from 'vscode-languageclient/node';
import * as vscode from "vscode";

let client: lsp.LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  let outputChannel = vscode.window.createOutputChannel('Buf', 'console');
  context.subscriptions.push(outputChannel);

  let bufContext = new buf.Context(() => { });
  context.subscriptions.push(bufContext);

  context.subscriptions.push(
    vscode.commands.registerCommand('buf.restartServer', async () => {
      if (bufContext.starting()) {
        return;
      }
      await bufContext.client.stop();
      await bufContext.client.start();
    }));
  context.subscriptions.push(
    vscode.commands.registerCommand('buf.stopServer', async () => {
      if (bufContext.starting()) {
        return;
      }
      await bufContext.client.stop();
    }));
  context.subscriptions.push(
    vscode.commands.registerCommand('buf.outputPanel', async () => {
      outputChannel.show();
    }));
  context.subscriptions.push(
    vscode.commands.registerCommand('buf.checkForUpdates', async () => {
      if (bufContext.starting()) {
        return;
      }
      
      let version = bufContext.binary.version();
      if (version instanceof Error) {
        vscode.window.showErrorMessage(`Could not detect language server version: ${version}.`);
        return;
      }

      let result = await bufContext.installer.checkForUpdates(version as string);
      if (result instanceof Error) {
        vscode.window.showErrorMessage(`Could not instal update: ${version}.`);
        return;
      }
    }));
    
  await bufContext.activate(outputChannel, context.globalStorageUri.fsPath);
}

export function deactivate() { }