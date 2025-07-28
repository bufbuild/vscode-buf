import * as vscode from "vscode";

import { Command } from "./command";
import { findCommand } from "./register-all-commands";

const extensionId = "bufbuild.vscode-buf";
type BufQuickPickItem = vscode.QuickPickItem & { command?: Command };

/**
 * showCommands is a command that pulls up the commands exposed by the extension.
 */
export const showCommands = new Command(
  "buf.showCommands",
  "COMMAND_TYPE_EXTENSION",
  async () => {
    const quickPickList: BufQuickPickItem[] = [];

    // Use package.json as the source of truth for command palette commands.
    const pkgJSON = vscode.extensions.getExtension(extensionId)?.packageJSON;
    if (pkgJSON.contributes?.commands) {
      const commands: {
        command: string;
        title: string;
        description: string;
      }[] = pkgJSON.contributes.commands;

      const bufCommands: BufQuickPickItem[] = [];
      const extCommands: BufQuickPickItem[] = [];
      const serverCommands: BufQuickPickItem[] = [];
      const setupCommands: BufQuickPickItem[] = [];
      for (const cmd of commands.sort((a, b) =>
        a.command.localeCompare(b.command)
      )) {
        const extCmd = findCommand(cmd.command);
        if (!extCmd) {
          throw new Error(`Command ${cmd.command} not found!`);
        }
        const commandPaletteItem = {
          label: cmd.title,
          command: extCmd,
          detail: cmd.description,
        };
        switch (extCmd.type) {
          case "COMMAND_TYPE_SERVER":
            serverCommands.push(commandPaletteItem);
            break;
          case "COMMAND_TYPE_BUF":
            bufCommands.push(commandPaletteItem);
            break;
          case "COMMAND_TYPE_SETUP":
            setupCommands.push(commandPaletteItem);
            break;
          case "COMMAND_TYPE_EXTENSION":
            extCommands.push(commandPaletteItem);
            break;
          default:
            throw new Error(`Command ${cmd.title} has an unknown type!`);
        }
      }
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Buf Language Server Commands",
      });
      quickPickList.push(...serverCommands);
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Buf Commands",
      });
      quickPickList.push(...bufCommands);
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Setup Commands",
      });
      quickPickList.push(...setupCommands);
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Extension Commands",
      });
      quickPickList.push(...extCommands);
    }
    vscode.window
      .showQuickPick(quickPickList)
      .then((cmd) => cmd?.command?.execute());
  }
);
