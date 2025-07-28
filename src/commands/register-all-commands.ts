import type * as vscode from "vscode";
import { bufGenerate } from "./buf-generate";
import type { Command } from "./command";
import { installBuf } from "./install-buf";
import { showCommands } from "./show-commands";
import { showOutput } from "./show-output";
import { startLanguageServer } from "./start-lsp";
import { stopLanguageServer } from "./stop-lsp";
import { updateBuf } from "./update-buf";

/**
 * @file Provides a convenience function for registering all commands in the extension.
 * Also provides a helper for finding a command by name.
 */

const commands = [
  bufGenerate,
  installBuf,
  showCommands,
  showOutput,
  startLanguageServer,
  stopLanguageServer,
  updateBuf,
];

/**
 * Convenience function for registering all commands to the extension.
 */
export const registerAllCommands = (ctx: vscode.ExtensionContext) => {
  commands.forEach((command) => {
    command.register(ctx);
  });
};

/**
 * A helper for finding the commands from the command list.
 */
export const findCommand = (name: string): Command | undefined => {
  return commands.find((command) => {
    return command.name === name;
  });
};
