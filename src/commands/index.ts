/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from "vscode";

import { BufContext } from "../context";

type CommandCallback<T = any> = (...args: any) => Promise<T> | T;

export type CommandFactory<T = any> = (
  ctx: vscode.ExtensionContext,
  bufCtx: BufContext
) => CommandCallback<T>;

// Various command types that can be registered with the command palette. Types
// control grouping in the command palette.
export enum CommandType {
  // Group of commands that run buf e.g. `buf generate`.
  COMMAND_BUF,

  // Group of commands that interact with the extension.
  COMMAND_EXTENSION,

  // Group of commands that relate to setting buf cli up e.g. install / update.
  COMMAND_SETUP,

  // Internal commands. Note: these are not registered in the command palette
  COMMAND_INTERNAL,
}

export class Command<T = any> {
  constructor(
    public readonly command: string,
    public readonly type: CommandType,
    private readonly factory: CommandFactory<T>
  ) {}

  register(ctx: vscode.ExtensionContext, bufCtx: BufContext) {
    ctx.subscriptions.push(
      vscode.commands.registerCommand(
        this.command,
        this.wrapCommand(ctx, bufCtx)
      )
    );
  }

  execute(): Thenable<T> {
    return vscode.commands.executeCommand<T>(this.command);
  }

  private wrapCommand(
    ctx: vscode.ExtensionContext,
    bufCtx: BufContext
  ): CommandCallback<T> {
    const fn = this.factory(ctx, bufCtx);

    return async (...args: any[]) => {
      let result: Promise<T> | T;

      bufCtx.busy = true;
      try {
        result = fn(...args);

        if (result instanceof Promise) {
          result = await result;
        }
      } finally {
        bufCtx.busy = false;
      }

      return result;
    };
  }
}

// Must be after above definitions due to circular dependency
export { bufGenerate } from "./buf-generate";
export { findBuf } from "./find-buf";
export { installBuf } from "./install-buf";
export { registerAllCommands } from "./register-all-commands";
export { restartBuf } from "./restart-buf";
export { showCommands } from "./show-commands";
export { showOutput } from "./show-output";
export { updateBuf } from "./update-buf";
