import * as vscode from "vscode";

import { BufContext } from "../context";

import { Command } from ".";
import { bufGenerate } from "./buf-generate";
import { findBuf } from "./find-buf";
import { installBuf } from "./install-buf";
import { loadBufModules } from "./load-buf-modules";
import { openBufYaml } from "./open-buf-yaml";
import { restartBuf } from "./restart-buf";
import { showCommands } from "./show-commands";
import { showOutput } from "./show-output";
import { updateBuf } from "./update-buf";

const commands = [
  bufGenerate,
  findBuf,
  installBuf,
  loadBufModules,
  openBufYaml,
  restartBuf,
  showCommands,
  showOutput,
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
