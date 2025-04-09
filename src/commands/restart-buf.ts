import * as os from "os";
import * as vscode from "vscode";
import * as lsp from "vscode-languageclient/node";
import * as config from "../config";

import { Command, CommandType, stopBuf } from ".";
import { protoDocumentSelector } from "../const";
import { BufContext, ServerStatus } from "../context";
import { log } from "../log";

export const restartBuf = new Command(
  "buf.restart",
  CommandType.COMMAND_EXTENSION,
  (_, bufCtx) => {
    const callback = async () => {
      if (bufCtx.client) {
        await stopBuf.execute();
      }

      if (!config.get<boolean>("enable")) {
        bufCtx.status = ServerStatus.SERVER_DISABLED;
        log.warn("Buf is disabled. Enable it by setting `buf.enable` to true.");
        return;
      }

      if (!bufCtx.buf) {
        log.error("Buf is not installed. Please install Buf.");
        bufCtx.status = ServerStatus.SERVER_NOT_INSTALLED;
        return;
      }

      bufCtx.status = ServerStatus.SERVER_STARTING;

      log.info(`Starting Buf Language Server (${bufCtx.buf.version})...`);

      const buf: lsp.Executable = {
        command: bufCtx.buf.path,
        args: getBufArgs(),
        options: {
          cwd: vscode.workspace.rootPath || process.cwd(), //todo: How do we support across multiple workspace folders?
        },
      };

      if (os.platform() !== "win32") {
        buf.transport = lsp.TransportKind.pipe;
      }

      const serverOptions: lsp.ServerOptions = buf;

      const clientOptions: lsp.LanguageClientOptions = {
        documentSelector: protoDocumentSelector,
        diagnosticCollectionName: "bufc",
        outputChannel: bufCtx.serverOutputChannel,
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

      bufCtx.client = new lsp.LanguageClient(
        "Buf Language Server",
        serverOptions,
        clientOptions
      );
      bufCtx.client.clientOptions.errorHandler = createErrorHandler(bufCtx);

      await bufCtx.client.start();

      bufCtx.status = ServerStatus.SERVER_RUNNING;

      log.info("Buf Language Server started.");
    };

    return callback;
  }
);

const getBufArgs = () => {
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
};

const createErrorHandler = (bufCtx: BufContext): lsp.ErrorHandler => {
  if (!bufCtx.client) {
    throw new Error("Client is not initialized.");
  }

  const errorHandler = bufCtx.client.createDefaultErrorHandler(
    config.get<boolean>("restartAfterCrash") ? /*default*/ 4 : 0
  );

  return {
    error: (error, message, count) => {
      return errorHandler.error(error, message, count);
    },
    closed: async () => {
      const result = await errorHandler.closed();

      if (result.action === lsp.CloseAction.DoNotRestart) {
        bufCtx.status = ServerStatus.SERVER_ERRORED;
        log.error(`Language Server closed unexpectedly. Not restarting.`);
      } else {
        log.warn(`Language Server closed unexpectedly. Restarting...`);
      }

      return result;
    },
  };
};
