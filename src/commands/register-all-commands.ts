import type * as vscode from "vscode";
import type { Command } from "./command";
import { bufBuild } from "./buf-build";
import { bufConfigInit } from "./buf-config-init";
import { bufConfigLsBreakingRules } from "./buf-config-ls-breaking-rules";
import { bufConfigLsLintRules } from "./buf-config-ls-lint-rules";
import { bufConfigLsModules } from "./buf-config-ls-modules";
import { bufDepPrune } from "./buf-dep-prune";
import { bufDepUpdate } from "./buf-dep-update";
import { bufGenerate } from "./buf-generate";
import { bufLsFiles } from "./buf-ls-files";
import { bufPrice } from "./buf-price";
import { bufStats } from "./buf-stats";
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
  bufBuild,
  bufConfigInit,
  bufConfigLsBreakingRules,
  bufConfigLsLintRules,
  bufConfigLsModules,
  bufDepPrune,
  bufDepUpdate,
  bufGenerate,
  bufLsFiles,
  bufPrice,
  bufStats,
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
