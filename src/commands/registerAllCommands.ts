import * as vscode from "vscode";

import { BufContext } from "../context";

import { Command } from ".";
import { bufGenerate } from "./bufGenerate";
import { findBuf } from "./findBuf";
import { installBuf } from "./installBuf";
import { loadBufModules } from "./loadBufModules";
import { openBufYaml } from "./openBufYaml";
import { restartBuf } from "./restartBuf";
import { showCommands } from "./showCommands";
import { showOutput } from "./showOutput";
import { updateBuf } from "./updateBuf";

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
