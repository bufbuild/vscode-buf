import * as vscode from "vscode";

import { bufState } from "../state";

/**
 * @file Provides the framework for defining extension Commands.
 */

const commandType = [
  "COMMAND_TYPE_EXTENSION",
  "COMMAND_TYPE_SETUP",
  "COMMAND_TYPE_SERVER",
  "COMMAND_TYPE_BUF",
] as const;

/**
 * The command types available for this extension.
 *
 * COMMAND_TYPE_EXTENSION commands are used to interact with extension-specifc elements,
 * e.g. showing the extension log output window.
 *
 * COMMAND_TYPE_SETUP commands are used to manage the Buf CLI tool used by the extension,
 * e.g. updating the Buf CLI version, installing the Buf CLI.
 *
 * COMMAND_TYPE_SERVER commands are used to manage the Buf LSP server, e.g. starting and
 * stopping the LSP server.
 *
 * COMMAND_TYPE_BUF commands are used to execute non-LSP server Buf CLI commands, e.g. `buf lint`.
 */
type CommandType = (typeof commandType)[number];

/**
 * CommandCallback defines the type for the callback containing command logic.
 */
export type CommandCallback<T = any> = (
  ctx: vscode.ExtensionContext,
  ...args: any
) => Promise<T> | T;

/**
 * Command creates a new extension command.
 *
 * This provides handling for the extension state when the command is executing.
 */
export class Command<T = any> {
  /**
   * @param {string} name - the name of the command
   * @param {CommandType} type - the type of the command
   * @param {CommandCallback} callback - the callback that contains the logic of the command
   */
  constructor(
    public readonly name: string,
    public readonly type: CommandType,
    public readonly callback: CommandCallback<T>
  ) {}

  /**
   * Registers the command to the extension. Also provides handling for the extension state.
   */
  register(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
      vscode.commands.registerCommand(this.name, this.wrapCommand(ctx))
    );
  }

  /**
   * Execute the command.
   */
  execute(): Thenable<T> {
    return vscode.commands.executeCommand<T>(this.name);
  }

  /**
   * Wrap the command callback to handle the extension state.
   */
  private wrapCommand(ctx: vscode.ExtensionContext): CommandCallback<T> {
    return async (...args: any[]) => {
      let result: Promise<T> | T;
      using _ = bufState.handleExtensionStatus("EXTENSION_PROCESSING");
      result = this.callback(ctx, ...args);
      if (result instanceof Promise) {
        result = await result;
      }
      return result;
    };
  }
}
