import * as vscode from "vscode";
import * as config from "../config";

import { extensionId } from "../const";
import { Command, CommandType } from "./command";
import { findCommand } from "./register-all-commands";

type BufQuickPickItem = vscode.QuickPickItem & { command?: Command };

export const showCommands = new Command(
  "buf.showCommands",
  CommandType.COMMAND_EXTENSION,
  () => {
    const quickPickList: BufQuickPickItem[] = [];

    const pkgJSON = vscode.extensions.getExtension(extensionId)?.packageJSON;
    if (pkgJSON.contributes && pkgJSON.contributes.commands) {
      const commands: {
        command: string;
        title: string;
        description: string;
      }[] = pkgJSON.contributes.commands;
      const bufCommands: BufQuickPickItem[] = [];
      const extCommands: BufQuickPickItem[] = [];
      const setupCommands: BufQuickPickItem[] = [];

      const configPathSet = !!config.get<string>("commandLine.path");

      for (const cmd of commands.sort((a, b) =>
        a.command.localeCompare(b.command)
      )) {
        const extCmd = findCommand(cmd.command);

        if (!extCmd) {
          throw new Error(`Command ${cmd.command} not found!`);
        }

        if (extCmd.type === CommandType.COMMAND_INTERNAL) {
          throw new Error(
            `Command ${cmd.command} is an internal command and should not be shown!`
          );
        }

        switch (extCmd.type) {
          case CommandType.COMMAND_BUF:
            bufCommands.push({
              label: cmd.title,
              command: extCmd,
              detail: cmd.description,
            });
            break;
          case CommandType.COMMAND_EXTENSION:
            extCommands.push({
              label: cmd.title,
              command: extCmd,
              detail: cmd.description,
            });
            break;
          case CommandType.COMMAND_SETUP:
            if (!configPathSet) {
              setupCommands.push({
                label: cmd.title,
                command: extCmd,
                detail: cmd.description,
              });
            }
            break;
          default:
            throw new Error(`Command ${cmd.title} has an unknown type!`);
        }
      }

      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Buf Commands",
      });
      quickPickList.push(...bufCommands);
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Extension Commands",
      });
      quickPickList.push(...extCommands);
      quickPickList.push({
        kind: vscode.QuickPickItemKind.Separator,
        label: "Setup Commands",
      });
      quickPickList.push(...setupCommands);
    }

    return () => {
      vscode.window
        .showQuickPick(quickPickList)
        .then((cmd) => cmd?.command?.execute());
    };
  }
);
