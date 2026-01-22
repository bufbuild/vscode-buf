import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { effect, signal } from "@preact/signals-core";
import * as semver from "semver";
import * as vscode from "vscode";
import * as lsp from "vscode-languageclient/node";
import which from "which";
import * as config from "./config";
import * as github from "./github";
import { log } from "./log";
import type { ExtensionStatus, LanguageServerStatus } from "./status";
import { execFile } from "./util";

/**
 * @file Provides the global state for the extension.
 */

/**
 * The Buf CLI file name to check for in storage.
 */
const bufFilename = os.platform() === "win32" ? "buf.exe" : "buf";

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
 * Minimum Buf version required to use LSP via `buf beta lsp`.
 */
const minBufBetaVersion = "v1.43.0";

/**
 * Minimum Buf version required to use LSP via `buf lsp serve`.
 */
const minBufVersion = "v1.59.0";

/**
 * BufState handles and tracks the state of the extension:
 *   - The `buf` CLI binary used by the extension
 *   - The LSP server (e.g. starting and stopping)
 *
 * @method init initializes the state of the Buf extension by setting up the buf CLI binary.
 * This is expected to be called when the extension is activated.
 * @method handleExtensionStatus sets the extension status on the state to the provided
 * status, and once the work is complete, sets the extension status back to idle.
 * @method getExtensionStatus gets the current extension status.
 * @method getLanguageServerStatus gets the current language server status.
 * @method getBufBinaryVersion gets the current Buf binary version.
 * @method getBufBinaryPath gets the current Buf binary path.
 * @method execBufCommand execs the Buf binary with the specified arguments and working directory.
 * @method startLanguageServer starts the LSP server and client.
 * @method stopLanguageServer stops the language server and client.
 *
 * BufState is globally managed -- all modules that interact with BufState should import
 * the exported global instance, bufState.
 */
class BufState {
  private _extensionStatus = signal<ExtensionStatus>("EXTENSION_IDLE");
  private _languageServerStatus = signal<LanguageServerStatus>(
    "LANGUAGE_SERVER_STOPPED"
  );

  private lspClient?: lsp.LanguageClient;
  private bufBinary?: BufBinary;

  public constructor() {
    effect(() => {
      switch (this._languageServerStatus.value) {
        case "LANGUAGE_SERVER_DISABLED":
          this.lspClient = undefined;
          break;
        case "LANGUAGE_SERVER_STARTING": {
          if (!this.bufBinary) {
            throw new Error(
              `Attempted to start language server with no Buf binary set`
            );
          }
          if (!this.lspClient) {
            throw new Error(
              `Attempted to start language server with no client set`
            );
          }
          log.info(`Starting Buf Language Server (${this.bufBinary.version})`);
          const listener = this.lspClient.onDidChangeState((event) => {
            if (
              event.oldState === lsp.State.Starting &&
              event.newState === lsp.State.Running
            ) {
              this._languageServerStatus.value = "LANGUAGE_SERVER_RUNNING";
              log.info("Buf Language Server started successfully.");
              // Log initialization details for debugging
              if (this.lspClient?.initializeResult) {
                log.info(
                  `LSP initialized with capabilities: ${JSON.stringify(this.lspClient.initializeResult.capabilities, null, 2)}`
                );
              }
              listener.dispose();
            }
          });
          this.lspClient.start().catch((reason) => {
            // Start failed, we log the error and allow the caller to retry
            log.error(`Error starting the Buf Language Server: ${reason}`);
          });
          break;
        }
        case "LANGUAGE_SERVER_ERRORED":
      }
    });
  }

  /**
   * handleExtensionStatus sets the extension status on the state to the provided status,
   * and once the work is complete, sets the extension status back to idle.
   */
  public handleExtensionStatus(status: ExtensionStatus) {
    this._extensionStatus.value = status;
    return {
      [Symbol.dispose]: () => {
        this._extensionStatus.value = "EXTENSION_IDLE";
      },
    };
  }

  /**
   * getExtensionStatus gets the current extension status.
   */
  public getExtensionStatus() {
    return this._extensionStatus.value;
  }

  /**
   * getLanguageServerStatus gets the current language server status.
   */
  public getLanguageServerStatus() {
    return this._languageServerStatus.value;
  }

  /**
   * getBufBinaryVersion gets the current Buf binary version.
   */
  public getBufBinaryVersion() {
    return this.bufBinary?.version ?? null;
  }

  /**
   * getBufBinaryPath gets the current Buf binary path.
   */
  public getBufBinaryPath() {
    return this.bufBinary?.path ?? null;
  }

  /**
   * execBufCommand execs the Buf binary with the specified arguments and working directory.
   *
   * If the Buf binary is not installed, then execBufCommand logs an error and is a no-op.
   */
  public async execBufCommand(args: string[], cwd: string) {
    if (!this.bufBinary) {
      log.error(`Buf binary not installed, no command run.`);
      return;
    }
    try {
      const { stdout, stderr } = await execFile(this.bufBinary.path, args, {
        cwd: cwd,
      });
      if (stderr) {
        log.error(`Error executing args ${args} in ${cwd}: ${stderr}`);
        return;
      }
      log.info(stdout);
    } catch (e) {
      log.error(`Error executing args ${args} in ${cwd}: ${e}`);
    }
  }

  /**
   * init initializes the state of the Buf extension by setting up the buf CLI binary and
   * starting up the LSP.
   *
   * We check the user's system $PATH for buf. If the user has buf installed locally, then
   * we use their locally installed version of buf.
   *
   * If the user does not have the buf binary installed locally, then the extension will
   * attempt to install the latest version of buf to the VS Code global storage and use that.
   *
   * If the user has a path set for buf using buf.commandLine.path, then we check for the
   * binary set at this path first. If this is not set or does not exist, then we fallback
   * to the default behavior above.
   *
   */
  public async init(ctx: vscode.ExtensionContext) {
    let configPath = config.get<string>("commandLine.path");
    if (configPath) {
      try {
        if (!path.isAbsolute(configPath)) {
          configPath = getBinaryPathForRelConfigPath(configPath);
        }
        log.info(`Attempting to use configured Buf CLI path '${configPath}...`);
        this.bufBinary = await getBufBinaryFromPath(configPath);
        log.info(
          `Using '${this.bufBinary.path}', version: ${this.bufBinary.version}.`
        );
        this.startLanguageServer(ctx);
        return;
      } catch (e) {
        log.error(
          `Error loading Buf from configured path '${configPath}': ${e}`
        );
      }
    }

    log.info("Looking for Buf on the system $PATH...");
    try {
      this.bufBinary = await findBufInSystemPath();
    } catch (e) {
      log.info(
        `Buf not found on the OS path: ${e}, installing from releases...`
      );
      const abort = new AbortController();
      try {
        const release = await github.getRelease("latest");
        const asset = await github.findAsset(release);
        this.bufBinary = await installReleaseAsset(
          ctx.globalStorageUri.fsPath,
          release,
          asset,
          abort
        );
      } catch (e) {
        if (!abort.signal.aborted) {
          log.info(`Failed to install buf: ${e}`);
          this._languageServerStatus.value = "LANGUAGE_SERVER_DISABLED";
          showPopup(
            `Failed to install Buf CLI. You may want to install it manually.`,
            "https://buf.build/docs/cli/installation/"
          );
        }
      }
    }
    this.startLanguageServer(ctx);
  }

  /**
   * startLanguageServer starts the LSP server and client.
   *
   * If the LSP server is already running (or already starting), then startLanguageServer
   * will log a warning and be a no-op.
   * If the LSP server is stopped or in an errored state, startLanguageServer will attempt
   * to start it.
   * If the LSP server and client are not set, then startLanguageServer checks the Buf CLI
   * tool installed and sets the LSP client, then attempts to start the LSP server and client.
   * If there is no installed version of Buf, then startLanguageServer will log a warning,
   * set the appropriate status and be a no-op.
   * If the installed version of Buf does not meet the minimum version requirements to use
   * the LSP, then startLanguageServer will log a warning and be a no-op.
   */
  public async startLanguageServer(ctx: vscode.ExtensionContext) {
    if (!serverOutputChannel) {
      serverOutputChannel = createConsoleOutputChannel("Buf (server)");
      ctx.subscriptions.push(serverOutputChannel);
    }
    if (this.lspClient) {
      if (
        this._languageServerStatus.value === "LANGUAGE_SERVER_STARTING" ||
        this._languageServerStatus.value === "LANGUAGE_SERVER_RUNNING"
      ) {
        log.warn("Buf Language Server already starting, no new actions taken.");
        return;
      }
      if (
        this._languageServerStatus.value === "LANGUAGE_SERVER_STOPPED" ||
        this._languageServerStatus.value === "LANGUAGE_SERVER_ERRORED"
      ) {
        log.warn("Buf Language Server currently stopped, starting...");
        this._languageServerStatus.value = "LANGUAGE_SERVER_STARTING";
        return;
      }
    }
    if (!this.bufBinary) {
      log.error(
        "No installed version of Buf found, cannot start Buf Language Server."
      );
      this._languageServerStatus.value = "LANGUAGE_SERVER_STOPPED";
      return;
    }
    const args = getBufArgs();
    if (args instanceof Error) {
      this._languageServerStatus.value = "LANGUAGE_SERVER_DISABLED";
      log.warn(
        `Buf version ${this.bufBinary?.version} does not meet minimum required version ${minBufBetaVersion} for Language Server features, disabling.`
      );
      return;
    }
    const serverOptions: lsp.Executable = {
      command: this.bufBinary.path,
      args: args,
    };
    // Set the workspace folder explicitly - this is important for the LSP to know
    // where to look for buf.yaml and proto files, especially on Windows
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      log.info(
        `Starting LSP with workspace folder: ${workspaceFolder.uri.fsPath}`
      );
    } else {
      log.warn("No workspace folder found when starting LSP");
    }

    const clientOptions: lsp.LanguageClientOptions = {
      documentSelector: protoDocumentSelector,
      diagnosticCollectionName: "bufc",
      outputChannel: serverOutputChannel,
      revealOutputChannelOn: lsp.RevealOutputChannelOn.Never,
      workspaceFolder: workspaceFolder,
      middleware: {
        // Always configure a hover provider on the client.
        provideHover: async (document, position, token, next) => {
          return next(document, position, token);
        },
      },
    };
    this.lspClient = new lsp.LanguageClient(
      "Buf Language Server",
      serverOptions,
      clientOptions
    );
    // Always restart buf LSP if it crashes, up to 4 times.
    const errorHandler = this.lspClient.createDefaultErrorHandler(4);
    this.lspClient.clientOptions.errorHandler = {
      error: (error, message, count) => {
        return errorHandler.error(error, message, count);
      },
      closed: async () => {
        const result = await errorHandler.closed();
        if (result.action === lsp.CloseAction.DoNotRestart) {
          this._languageServerStatus.value = "LANGUAGE_SERVER_ERRORED";
          log.error(`Language Server closed unexpectedly. Not restarting.`);
        } else {
          log.error(`Language Server closed unexpectedly. Restarting...`);
        }
        return result;
      },
    };
    this._languageServerStatus.value = "LANGUAGE_SERVER_STARTING";
  }

  /**
   * stopLanguageServer stops the language server and client.
   */
  public async stopLanguageServer() {
    if (this.lspClient) {
      log.info(`Stopping Buf Language Server...`);
      try {
        await this.lspClient.stop();
      } catch (e) {
        log.error(`Error stopping language server: ${e}`);
      }
      this._languageServerStatus.value = "LANGUAGE_SERVER_STOPPED";
    }
  }
}

/**
 * The global state as defined by {@link BufState}.
 */
export const bufState = new BufState();

/**
 * A helper function for getting the binary path based on a relative path config. We check
 * each workspace folder and return the first relative binary path that exists, otherwise
 * return undefined.
 */
function getBinaryPathForRelConfigPath(configPath: string): string {
  if (vscode.workspace.workspaceFolders) {
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      const joinedPath = path.join(workspaceFolder.uri.fsPath, configPath);
      if (fs.existsSync(joinedPath)) {
        return joinedPath;
      }
    }
  }
  throw new Error(`Unable to use relative Buf binary path ${configPath}`);
}

/**
 * BufBinary contains the Buf CLI binary information used by the extension.
 *
 * @param path is the path to the binary.
 * @param version is the semver binary version.
 */
type BufBinary = {
  readonly path: string;
  readonly version: semver.SemVer;
};

/**
 * A helper function for getting the Buf binary at the given filesystem path.
 */
async function getBufBinaryFromPath(path: string): Promise<BufBinary> {
  const { stdout, stderr } = await execFile(path, ["--version"]);
  if (stderr) {
    throw new Error(`Error getting version of buf binary '${path}': ${stderr}`);
  }
  // Some vendors add trailing ~patchlevel, ignore this. This is currently not something
  // we do for Buf CLI releases, but this supports custom builds.
  const rawVersion = stdout.trim().split(/\s|~/, 1)[0];
  if (!rawVersion) {
    throw new Error(`Unable to determine version of '${path}'`);
  }
  return {
    path: path,
    version: new semver.SemVer(rawVersion),
  };
}

/**
 * A helper function for finding the Buf CLI on the system $PATH.
 */
async function findBufInSystemPath(): Promise<BufBinary> {
  const bufPath = await which(bufFilename, { nothrow: true });
  if (bufPath) {
    return getBufBinaryFromPath(bufPath);
  }
  throw new Error(`Unable to find buf binary on system $PATH`);
}

/**
 * A helper for installing the specified GitHub release and asset.
 */
async function installReleaseAsset(
  storagePath: string,
  release: github.Release,
  asset: github.Asset,
  abort: AbortController
): Promise<BufBinary> {
  const downloadDir = path.join(storagePath, release.tag_name);
  await fs.promises.mkdir(downloadDir, { recursive: true });
  const downloadBin = path.join(downloadDir, bufFilename);
  try {
    // Check to see if the downloadBin already exists and if we have access to the binary.
    await fs.promises.access(downloadBin);
    // We await for the bufBinary to be set before returning so we can catch any errors.
    const bufBinary = await getBufBinaryFromPath(downloadBin);
    log.info(`Using buf version v${bufBinary.version} from extension cache.`);
    return bufBinary;
  } catch (e) {
    // In the case of an error, we log, and then move on to attempt a download.
    log.info(`No buf binary available locally, downloading... ${e}`);
  }
  log.info(`Downloading ${asset.name} to ${downloadBin}...`);
  await github.download(asset, downloadBin, abort);
  await fs.promises.chmod(downloadBin, 0o755);
  // We await for the bufBinary to be set before returning and mutating the extension state.
  const bufBinary = await getBufBinaryFromPath(downloadBin);
  vscode.window.showInformationMessage(`Buf ${release.name} is now installed.`);
  return bufBinary;
}

/**
 * A helper for showing a pop-up message to the user.
 */
async function showPopup(message: string, url: string) {
  if (await vscode.window.showInformationMessage(message, "Open website")) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
}

/**
 * A helper for getting the Buf CLI args for the LSP server.
 *
 * Returns an error if bufVersion is too low to run the LSP server.
 */
function getBufArgs() {
  const bufArgs = ["--log-format", "text"];
  if (config.get<string>("debugLogs")) {
    bufArgs.push("--debug");
  }
  const bufVersion = bufState.getBufBinaryVersion();
  let args = ["lsp", "serve"];
  if (bufVersion?.compare(minBufVersion) === -1) {
    args = ["beta", "lsp"];
    if (bufVersion?.compare(minBufBetaVersion) === -1) {
      return new Error("buf version too low for LSP");
    }
  }
  bufArgs.push(...args);
  return bufArgs;
}

/**
 * A helper function for creating the VS Code output channel. A debug option is available
 * to enable output to local console for development.
 */
function createConsoleOutputChannel(
  name: string,
  debug?: boolean
): vscode.OutputChannel {
  const localChannel = vscode.window.createOutputChannel(name);
  if (!debug) {
    return localChannel;
  }
  return {
    ...localChannel,
    append: (line: string) => {
      console.log("---LSP LOG: ", line);
      return localChannel.append(line);
    },
    appendLine: (line: string) => {
      console.log("---LSP LOG: ", line);
      return localChannel.appendLine(line);
    },
  };
}
