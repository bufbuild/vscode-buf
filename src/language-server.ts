import * as vscode from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';

export const newBufLanguageClient = (binaryPath: string) => {
    let lsConf = vscode.workspace
        .getConfiguration("buf");

    const serverOptions: ServerOptions = {
        command: binaryPath,
        args: lsConf.get<string[]>("lsp")
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'proto' }],
      };

    return  new LanguageClient(
        'vscode-buf-ls-client',
        'Client for buf language server',
        serverOptions,
        clientOptions
      );
}



