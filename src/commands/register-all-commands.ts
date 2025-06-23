import * as vscode from "vscode";

import { Command } from "./command";
import { bufGenerate } from "./buf-generate";
import { installBuf } from "./install-buf";
import { showCommands } from "./show-commands";
import { showOutput } from "./show-output";
import { startBuf } from "./start-buf";
import { stopBuf } from "./stop-buf";
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
  startBuf,
  stopBuf,
  updateBuf,
];

const commandMap = new Map<string, Command>();
commands.forEach((command) => {
  commandMap.set(command.name, command);
});

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
export const findCommand = (command: string): Command | undefined => {
  return commandMap.get(command);
};
