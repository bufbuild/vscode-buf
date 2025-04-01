import * as vscode from "vscode";

import { BufContext } from "../context";

type CommandCallback<T extends unknown = any> = (...args: any) => Promise<T> | T;

export type CommandFactory<T extends unknown = any> = (
  ctx: vscode.ExtensionContext,
  bufCtx: BufContext
) => CommandCallback<T>;

export enum CommandType {
  // Commands to run buf commands e.g. generate
  // eslint-disable-next-line @typescript-eslint/naming-convention
  COMMAND_BUF,

  // Extension commands
  // eslint-disable-next-line @typescript-eslint/naming-convention
  COMMAND_EXTENSION,

  // Commands to setup the extension e.g. install buf
  // eslint-disable-next-line @typescript-eslint/naming-convention
  COMMAND_SETUP,

  // Internal commands. Note: these are not registered in the command palette
  // eslint-disable-next-line @typescript-eslint/naming-convention
  COMMAND_INTERNAL,
}

export class Command<T extends unknown = any> {
  constructor(
    public readonly command: string,
    public readonly type: CommandType,
    private readonly factory: CommandFactory<T>
  ) {}

  register(ctx: vscode.ExtensionContext, bufCtx: BufContext) {
    ctx.subscriptions.push(vscode.commands.registerCommand(this.command, this.wrapCommand(ctx, bufCtx)));
  }

  execute(): Thenable<T> {
    return vscode.commands.executeCommand<T>(this.command);
  }

  private wrapCommand(ctx: vscode.ExtensionContext, bufCtx: BufContext): CommandCallback<T> {
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
export { bufGenerate } from "./bufGenerate";
export { findBuf } from "./findBuf";
export { installBuf } from "./installBuf";
export { loadBufModules } from "./loadBufModules";
export { openBufYaml } from "./openBufYaml";
export { registerAllCommands } from "./registerAllCommands";
export { restartBuf } from "./restartBuf";
export { showCommands } from "./showCommands";
export { showOutput } from "./showOutput";
export { updateBuf } from "./updateBuf";