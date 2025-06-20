import * as lsp from "vscode-languageclient/node";
import { signal, computed } from "@preact/signals-core";
import * as version from "./version";

export type BufFile = {
  path: string;
  module: string;
};

export enum ServerStatus {
  SERVER_DISABLED,
  SERVER_STARTING,
  SERVER_RUNNING,
  SERVER_STOPPED,
  SERVER_ERRORED,
  SERVER_NOT_INSTALLED,
}

export class BufContext {
  public client?: lsp.LanguageClient;
  public bufFiles: Map<string, BufFile> = new Map<string, BufFile>();

  // Signals for reactive state
  private _status = signal<ServerStatus>(ServerStatus.SERVER_STOPPED);
  private _busy = signal<boolean>(false);
  private _buf = signal<version.BufVersion | undefined>(undefined);


  public set status(value: ServerStatus) {
    this._status.value = value;
  }

  public get status(): ServerStatus {
    return this._status.value;
  }

  public set busy(value: boolean) {
    this._busy.value = value;
  }

  public get busy(): boolean {
    return this._busy.value;
  }

  public set buf(value: version.BufVersion | undefined) {
    if (this._buf.value !== value) {
      this._buf.value = value;
      if (!value) {
        this._status.value = ServerStatus.SERVER_NOT_INSTALLED;
      }
    }
  }

  public get buf(): version.BufVersion | undefined {
    return this._buf.value;
  }

  // Computed properties for derived state

  public readonly displayText = computed(() => {
    const bufVersion = this._buf.value?.version;
    return bufVersion ? ` (${bufVersion})` : "";
  });

  // Access to signals for direct subscription in effects
  public get statusSignal() {
    return this._status;
  }

  public get busySignal() {
    return this._busy;
  }

  public get bufSignal() {
    return this._buf;
  }
}
