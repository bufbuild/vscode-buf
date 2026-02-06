import type * as vscode from "vscode";
import { bufBuild } from "./buf-build";
import { bufConfigInit } from "./buf-config-init";
import { bufConfigLsBreakingRules } from "./buf-config-ls-breaking-rules";
import { bufConfigLsLintRules } from "./buf-config-ls-lint-rules";
import { bufDepPrune } from "./buf-dep-prune";
import { bufDepUpdate } from "./buf-dep-update";
import { bufGenerate } from "./buf-generate";
import type { Command } from "./command";
import { showCommands } from "./show-commands";
import { showOutput } from "./show-output";
import { startLanguageServer } from "./start-lsp";
import { stopLanguageServer } from "./stop-lsp";

/**
 * @file Provides a convenience function for registering all commands in the extension.
 * Also provides a helper for finding a command by name.
 */

const commands = [
  bufBuild,
  bufConfigInit,
  bufConfigLsBreakingRules,
  bufConfigLsLintRules,
  bufDepPrune,
  bufDepUpdate,
  bufGenerate,
  showCommands,
  showOutput,
  startLanguageServer,
  stopLanguageServer,
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
