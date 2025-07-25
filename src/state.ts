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
 * Minimum Buf version required to use LSP.
 */
const minBufVersion = "v1.43.0";

/**
 * BufState handles and tracks the state of the extension:
 *   - The `buf` CLI binary used by the extension
 *   - The LSP server (e.g. starting and stopping)
 *
 * @method handleExtensionStatus sets the extension status on the state to the provided
 * status, and once the work is complete, sets the extension status back to idle.
 * @method getExtensionStatus gets the current extension status.
 * @method getLanguageServerStatus gets the current language server status.
 * @method getBufBinaryVersion gets the current Buf binary version.
 * @method execBufCommand execs the Buf binary with the specified arguments and working directory.
 * @method installBufBinary installs the Buf CLI for the extension based on the extension
 * configuration.
 * @method updateBufBinary updates the Buf CLI for the extension based on the extension
 * configuration.
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
        case "LANGUAGE_SERVER_NOT_INSTALLED":
          this.bufBinary = undefined;
          this.lspClient = undefined;
          break;
        case "LANGUAGE_SERVER_DISABLED":
          this.lspClient = undefined;
          break;
        case "LANGUAGE_SERVER_STARTING":
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
          this.lspClient.start().then(
            () => {
              this._languageServerStatus.value = "LANGUAGE_SERVER_RUNNING";
              log.info("Buf Language Server started.");
            },
            (reason) => {
              // Start failed, we log the error and allow the caller to retry
              log.error(`Error starting the Buf Language Server: ${reason}`);
            }
          );
          break;
        case "LANGUAGE_SERVER_ERRORED":
      }
    });
  }

  public printLogs() {
    
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
    return this.bufBinary?.version ?? "";
  }

  /**
   * getBufBinaryPath gets the current Buf binary path.
   */
  public getBufBinaryPath() {
    return this.bufBinary?.path ?? "";
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
   * installBufBinary installs the Buf CLI for the extension based on the extension configuration.
   *
   * There are two configuration fields for managing the Buf CLI binary:
   *  buf.commandLine.path: a path to a local binary, e.g. /usr/local/bin/buf
   *  buf.commandLine.version: the expected version of the Buf binary, e.g. v1.53.0. This can
   *  also be set to "latest", in which case, the extension will check for and expect the latest
   *  released version of the Buf CLI.
   *
   * When checking for the Buf CLI binary, the resolution logic uses the following order of
   * precendence:
   *  1. The path set on buf.commandLine.path.
   *  2. The version set to buf.commandLine.version. If "latest" is set, check for and use the
   *  latest released version of the Buf CLI.
   *  3. If neither buf.commandLine.path or buf.commandLine.version is set, look for the Buf
   *  CLI on the OS path.
   *
   * If the Buf CLI for the configured path is already installed, then installBufBinary logs
   * this and is a no-op.
   */
  public async installBufBinary(storagePath: string) {
    let configPath = config.get<string>("commandLine.path");
    const configVersion = config.get<string>("commandLine.version");

    if (configPath) {
      if (!path.isAbsolute(configPath)) {
        try {
          configPath = getBinaryPathForRelConfigPath(configPath);
        } catch (e) {
          log.error(`Error loading buf from relative config path: ${e}`);
          this._languageServerStatus.value = "LANGUAGE_SERVER_NOT_INSTALLED";
          return;
        }
      }
      if (configVersion) {
        log.warn(
          "Both 'buf.commandLine.path' and 'buf.commandLine.version' are set. Using 'buf.commandLine.path'."
        );
      }
      if (this.bufBinary && this.bufBinary.path === configPath) {
        log.info(
          `Buf CLI for configured path '${configPath}' already installed`
        );
        return;
      }
      try {
        log.info(`Installing Buf CLI set to path '${configPath}...`);
        this.bufBinary = await getBufBinaryFromPath(configPath);
        log.info(
          `Using '${this.bufBinary.path}', version: ${this.bufBinary.version}.`
        );
      } catch (e) {
        log.error(`Error loading buf from path '${configPath}': ${e}`);
        this._languageServerStatus.value = "LANGUAGE_SERVER_NOT_INSTALLED";
      }
      return;
    }
    if (configVersion) {
      await this.updateBufBinary(storagePath);
      return;
    }
    log.info("Looking for Buf on the system $PATH...");
    try {
      this.bufBinary = await findBufInSystemPath();
    } catch (e) {
      log.error(`Buf is not installed on the OS path: ${e}`);
      this._languageServerStatus.value = "LANGUAGE_SERVER_NOT_INSTALLED";
    }
  }

  /**
   * updateBufBinary updates the Buf CLI for the extension based on the extension configuration.
   *
   * The version is specified by the buf.commandLine.version configuration.
   *
   * updateBufBinary will download and install the configured version of the Buf CLI if there
   * is currently no version of the Buf CLI used by the extension or if the current version
   * used does not match the configured version.
   *
   * If an explicit path to the Buf CLI binary is specified via buf.commandLine.path, then
   * updateBufBinary displays a warning and is a no-op.
   *
   * If no version is set, then updateBuf displays a warning and is a no-op.
   *
   * If the version set is not valid semver, then updateBufBinary displays a warning and is
   * a no-op.
   *
   * If the version set cannot be resolved, then updateBufBinary will provide the user with
   * a pop-up with the error message and a link to the installation docs.
   */
  public async updateBufBinary(storagePath: string) {
    if (config.get<string>("commandLine.path")) {
      vscode.window.showErrorMessage(
        "'buf.commandLine.path' is explicitly set, no updates will be made."
      );
      return;
    }
    const configVersion = config.get<string>("commandLine.version");
    if (!configVersion) {
      vscode.window.showErrorMessage(
        "'buf.commandLine.version' is not set, no updates will be made."
      );
      return;
    }
    if (configVersion !== "latest") {
      if (!semver.valid(configVersion)) {
        log.error(
          `buf.commandLine.version '${configVersion}' is not a valid semver version, no updates installed for Buf CLI...`
        );
        return;
      }
    }
    if (
      this.bufBinary &&
      configVersion !== "latest" &&
      this.bufBinary.version.compare(configVersion) === 0
    ) {
      log.info(`Already installed Buf CLI version '${configVersion}',`);
      return;
    }
    const abort = new AbortController();
    try {
      log.info(`Checking github releases for '${configVersion}' release...`);
      const release = await github.getRelease(configVersion);
      const asset = await github.findAsset(release);
      this.bufBinary = await installReleaseAsset(
        storagePath,
        release,
        asset,
        abort
      );
      vscode.window.showInformationMessage(
        `Buf ${release.name} is now installed.`
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        log.info(`Failed to install buf: ${e}`);
        this._languageServerStatus.value = "LANGUAGE_SERVER_NOT_INSTALLED";
        showPopup(
          `Failed to install Buf CLI. You may want to install it manually.`,
          "https://buf.build/docs/cli/installation/"
        );
      }
    }
  }

  /**
   * startLanguageServer starts the LSP server and client.
   *
   * If the LSP is disabled through configuration, then startLanguageServer will display
   * a warning, set the appropriate status, and be a no-op.
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
    if (!config.get("enable")) {
      await this.stopLanguageServer();
      this._languageServerStatus.value = "LANGUAGE_SERVER_DISABLED";
      log.warn("Buf is disabled. Enable it by setting 'buf.enable' to true.");
      return;
    }
    if (this.bufBinary?.version.compare(minBufVersion) === -1) {
      this._languageServerStatus.value = "LANGUAGE_SERVER_DISABLED";
      log.warn(
        `Buf version does not meet minimum required version ${minBufVersion} for Language Server features, disabling.`
      );
      return;
    }
    if (this.lspClient) {
      if (this._languageServerStatus.value === "LANGUAGE_SERVER_STARTING") {
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
      if (this._languageServerStatus.value === "LANGUAGE_SERVER_RUNNING") {
        log.warn("Buf Language Server already running, restarting.");
        await this.stopLanguageServer();
        this._languageServerStatus.value = "LANGUAGE_SERVER_STARTING";
        return;
      }
    }
    if (!this.bufBinary) {
      log.error(
        "No installed version of Buf found, cannot start Buf Language Server."
      );
      this._languageServerStatus.value = "LANGUAGE_SERVER_NOT_INSTALLED";
      return;
    }
    const serverOptions: lsp.Executable = {
      command: this.bufBinary.path,
      args: getBufArgs(),
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
    this.lspClient = new lsp.LanguageClient(
      "Buf Language Server",
      serverOptions,
      clientOptions
    );
    const errorHandler = this.lspClient.createDefaultErrorHandler(
      config.get<boolean>("restartAfterCrash") ? 4 : 0
    );
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
      const joinedPath = path.join(workspaceFolder.uri.path, configPath);
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
    return bufBinary;
  } catch (e) {
    // In the case of an error, we log, and then move on to attempt a download.
    log.error(`Error accessing buf binary, downloading... ${e}`);
  }
  log.info(`Downloading ${asset.name} to ${downloadBin}...`);
  await github.download(asset, downloadBin, abort);
  await fs.promises.chmod(downloadBin, 0o755);
  // We await for the bufBinary to be set before returning and mutating the extension state.
  const bufBinary = await getBufBinaryFromPath(downloadBin);
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


function createConsoleOutputChannel(name: string): vscode.OutputChannel {
  const localChannel = vscode.window.createOutputChannel(name);
  return {
    ...localChannel,
    append: (line: string) => {
      console.log("---LSP LOG: ", line);
      return localChannel.append(line);
    },
    appendLine: (line: string) => {
      console.log("---LSP LOG: ", line);
      return localChannel.appendLine(line);
    }
  }
}