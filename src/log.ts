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
    console.log("+++Extension Log: TRACE ", ...messages);
    this.output.trace(this.stringify(messages));
  }

  debug(...messages: [unknown, ...unknown[]]): void {
    console.log("+++Extension Log: DEBUG ", ...messages);
    this.output.debug(this.stringify(messages));
  }

  info(...messages: [unknown, ...unknown[]]): void {
    console.log("+++Extension Log: INFO ", ...messages);
    this.output.info(this.stringify(messages));
  }

  warn(...messages: [unknown, ...unknown[]]): void {
    console.log("+++Extension Log: WARN ", ...messages);
    this.output.warn(this.stringify(messages));
  }

  error(...messages: [unknown, ...unknown[]]): void {
    console.log("+++Extension Log: ERROR ", ...messages);
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
