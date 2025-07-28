import { inspect } from "node:util";
import * as vscode from "vscode";

/**
 * @file Provides a global logger to the Buf extension output channel.
 */

/**
 * Log is a global logger for the Buf extension output channel.
 */
class Log {
  private readonly output = vscode.window.createOutputChannel("Buf", {
    log: true,
  });

  trace(...messages: [unknown, ...unknown[]]): void {
    this.output.trace(this.stringify(messages));
  }

  debug(...messages: [unknown, ...unknown[]]): void {
    this.output.debug(this.stringify(messages));
  }

  info(...messages: [unknown, ...unknown[]]): void {
    this.output.info(this.stringify(messages));
  }

  warn(...messages: [unknown, ...unknown[]]): void {
    this.output.warn(this.stringify(messages));
  }

  error(...messages: [unknown, ...unknown[]]): void {
    this.output.error(this.stringify(messages));
    this.output.show(true);
  }

  show(): void {
    this.output.show();
  }

  private stringify(messages: unknown[]): string {
    return messages
      .map((message) => {
        if (typeof message === "string") {
          return message;
        }
        if (message instanceof Error) {
          return message.stack || message.message;
        }
        return inspect(message, { depth: 6, colors: false });
      })
      .join(" ");
  }
}

/**
 * The global logger as defined by {@link Log}.
 */
export const log = new Log();
