import * as vscode from "vscode";

import { BufContext } from "../context";
import { Command } from "./command";

import { bufGenerate } from "./buf-generate";
import { findBuf } from "./find-buf";
import { installBuf } from "./install-buf";
import { restartBuf } from "./restart-buf";
import { showCommands } from "./show-commands";
import { showOutput } from "./show-output";
import { stopBuf } from "./stop-buf";
import { updateBuf } from "./update-buf";

const commands = [
  bufGenerate,
  findBuf,
  installBuf,
  restartBuf,
  showCommands,
  showOutput,
  stopBuf,
  updateBuf,
];

const commandMap = new Map<string, Command>();
commands.forEach((command) => {
  commandMap.set(command.command, command);
});

export const registerAllCommands = (
  ctx: vscode.ExtensionContext,
  bufCtx: BufContext
) => {
  commands.forEach((command) => {
    command.register(ctx, bufCtx);
  });
};

export const findCommand = (command: string): Command | undefined => {
  return commandMap.get(command);
};
