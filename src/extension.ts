import * as buf from "./buf"
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
      await bufContext.client.stop()
    }));
  context.subscriptions.push(
    vscode.commands.registerCommand('buf.outputPanel', async () => {
      outputChannel.show();
    }));
    
  await bufContext.activate(outputChannel);
}

export function deactivate() { }