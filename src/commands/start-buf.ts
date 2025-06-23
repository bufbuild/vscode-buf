import * as vscode from "vscode";
import * as lsp from "vscode-languageclient/node";
import * as config from "../config";

import { Command } from "./command";
import { log } from "../log";
import { bufState } from "../state";

/**
 * The output channel for the LSP server. It is useful to separate this from the extension
 * logs for ease of debugging. We manage this output channel as a global state of the extension
 * so that each time we start/stop the LSP sever, we don't create new output channels.
 */
let serverOutputChannel: vscode.OutputChannel | undefined;

/**
 * A {@link vscode.DocumentSelector} for proto files.
 */
const protoDocumentSelector = [{ scheme: "file", language: "proto" }];

/**
 * startBuf starts the LSP server and client.
 *
 * If the LSP is disabled through configuration, then startBuf will display a warning, set
 * the appropriate status, and be a no-op.
 * If the LSP server is already running (or already starting), then startBuf will log a
 * warning and be a no-op.
 * If the LSP server is stopped or in an errored state, startBuf will attempt to start it
 * back up.
 * If the LSP server and client are not set, then startBuf checks the Buf CLI tool installed
 * and sets the LSP client, then attempts to start the LSP server and client.
 * If there is no installed version of Buf, then startBuf will log a warning, set the appropriate
 * status and be a no-op.
 */
export const startBuf = new Command(
  "buf.start",
  "COMMAND_TYPE_SERVER",
  async (ctx) => {
    if (!serverOutputChannel) {
      serverOutputChannel = vscode.window.createOutputChannel("Buf (server)");
      ctx.subscriptions.push(serverOutputChannel);
    }
    if (!config.get<boolean>("enable")) {
      bufState.client = undefined;
      bufState.languageServerStatus = "LANGUAGE_SERVER_DISABLED";
      log.warn("Buf is disabled. Enable it by setting 'buf.enable' to true.");
      return;
    }
    if (bufState.client) {
      if (
        bufState.languageServerStatus === "LANGUAGE_SERVER_RUNNING" ||
        bufState.languageServerStatus === "LANGUAGE_SERVER_STARTING"
      ) {
        log.warn("Buf Language Server already started, no new actions taken.");
        return;
      }
      if (
        bufState.languageServerStatus === "LANGUAGE_SERVER_STOPPED" ||
        bufState.languageServerStatus === "LANGUAGE_SERVER_ERRORED"
      ) {
        log.warn("Buf Language Server currently stopped, starting...");
        bufState.languageServerStatus = "LANGUAGE_SERVER_STARTING";
        await bufState.client.start();
        bufState.languageServerStatus = "LANGUAGE_SERVER_RUNNING";
        log.info("Buf Language Server started.");
        return;
      }
    }
    if (!bufState.buf) {
      log.error(
        "No installed version of Buf found, cannot start Buf Language Server."
      );
      bufState.languageServerStatus = "LANGUAGE_SERVER_NOT_INSTALLED";
      return;
    }
    bufState.languageServerStatus = "LANGUAGE_SERVER_STARTING";
    log.info(`Starting Buf Language Server (${bufState.buf.version})...`);
    const serverOptions: lsp.Executable = {
      command: bufState.buf.path,
      args: getBufArgs(),
      options: {
        // TODO: support multi-root workspaces, rootPath is deprecated.
        cwd: vscode.workspace.rootPath || process.cwd(),
      },
    };
    const clientOptions: lsp.LanguageClientOptions = {
      documentSelector: protoDocumentSelector,
      diagnosticCollectionName: "bufc",
      outputChannel: serverOutputChannel,
      // TODO: we can consider making this configurable through our settings.
      revealOutputChannelOn: lsp.RevealOutputChannelOn.Never,
      middleware: {
        provideHover: async (document, position, token, next) => {
          if (!config.get<boolean>("enableHover")) {
            return null;
          }
          return next(document, position, token);
        },
      },
      markdown: {
        supportHtml: true,
      },
    };
    bufState.client = new lsp.LanguageClient(
      "Buf Language Server",
      serverOptions,
      clientOptions
    );
    bufState.client.clientOptions.errorHandler = createErrorHandler();
    await bufState.client.start();
    bufState.languageServerStatus = "LANGUAGE_SERVER_RUNNING";
    log.info("Buf Language Server started.");
  }
);

/**
 * A helper for getting the Buf CLI args for the LSP server.
 */
function getBufArgs() {
  const bufArgs = [];
  if (config.get<string>("debug")) {
    bufArgs.push("--debug");
  }
  const logFormat = config.get<string | null>("log-format");
  if (logFormat) {
    bufArgs.push("--log-format", logFormat);
  }
  bufArgs.push("beta", "lsp");
  return bufArgs;
}

/**
 * Helper to create an error handler for the LSP client. The error handler sets the configured
 * restart limit and sets the appropriate LSP server status on bufState.
 * The client must first be initialised before the error handler is set.
 */
function createErrorHandler(): lsp.ErrorHandler {
  if (!bufState.client) {
    throw new Error("Client is not initialized.");
  }

  const errorHandler = bufState.client.createDefaultErrorHandler(
    config.get<boolean>("restartAfterCrash") ? /*default*/ 4 : 0
  );

  return {
    error: (error, message, count) => {
      return errorHandler.error(error, message, count);
    },
    closed: async () => {
      const result = await errorHandler.closed();

      if (result.action === lsp.CloseAction.DoNotRestart) {
        bufState.languageServerStatus = "LANGUAGE_SERVER_ERRORED";
        log.error(`Language Server closed unexpectedly. Not restarting.`);
      } else {
        log.warn(`Language Server closed unexpectedly. Restarting...`);
      }

      return result;
    },
  };
}
