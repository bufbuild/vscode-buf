import * as vscode from "vscode";
import * as lsp from "vscode-languageclient/node";
import * as version from "./version";

import { LanguageServerStatus, ExtensionStatus } from "./status";

/**
 * @file Provides the global state for the extension.
 */

/**
 * BufState handles and tracks the state of the Buf extension:
 *  @param extensionStatus - the current status of the extension
 *  @param _languageServerStatus - the status of the LSP server
 *  This may be empty,
 *  when the state is activated and disposed when the state is deactivated.
 *  @param _buf - the Buf CLI version used by the extension.
 *
 * All commands will set the overall extension status. When commands are done running, the
 * extension status will be set back to idle.
 *
 * Commands that interact with the LSP server should set and get LSP server status as appropriate.
 * Commands that affect the Buf version used by the LSP should update the version as appropriate.
 *
 * BufState is globally managed -- all modules that interact with BufState should import
 * the exported global instance, bufState.
 */
class BufState {
  public client?: lsp.LanguageClient;

  private extensionStatus: ExtensionStatus = "EXTENSION_IDLE";
  private _languageServerStatus: LanguageServerStatus =
    "LANGUAGE_SERVER_STOPPED";
  private _buf?: version.BufVersion;
  private onDidChangeStateEmitter = new vscode.EventEmitter<void>();

  /**
   * A {@link vscode.Event} for when the extension state has changed. These includes changes
   * in the LSP server status and overall extension state.
   */
  public get onDidChangeState(): vscode.Event<void> {
    return this.onDidChangeStateEmitter.event;
  }

  /**
   * Get the current extension status.
   */
  public getExtensionStatus() {
    return this.extensionStatus;
  }

  /**
   * handleExtensionStatus sets the extension status on the state to the provided status,
   * and once the work is complete, sets the extension status back to idle.
   */
  public handleExtensionStatus(status: ExtensionStatus) {
    this.extensionStatus = status;
    this.onDidChangeStateEmitter.fire();
    return {
      [Symbol.dispose]: () => {
        this.extensionStatus = "EXTENSION_IDLE";
        this.onDidChangeStateEmitter.fire();
      },
    };
  }

  /**
   * Setter for @param _languageServerStatus.
   */
  public set languageServerStatus(value: LanguageServerStatus) {
    if (this._languageServerStatus !== value) {
      this._languageServerStatus = value;
      this.onDidChangeStateEmitter.fire();
    }
  }

  /**
   * Getter for @param _languageServerStatus.
   */
  public get languageServerStatus(): LanguageServerStatus {
    return this._languageServerStatus;
  }

  /**
   * Setter for @param _buf.
   */
  public set buf(value: version.BufVersion | undefined) {
    if (this._buf !== value) {
      this._buf = value;
      if (!value) {
        this._languageServerStatus = "LANGUAGE_SERVER_NOT_INSTALLED";
      }
      this.onDidChangeStateEmitter.fire();
    }
  }

  /**
   * Getter for @param _buf.
   */
  public get buf(): version.BufVersion | undefined {
    return this._buf;
  }
}

/**
 * The global state as defined by {@link BufState}.
 */
export const bufState = new BufState();
