import * as cp from "child_process";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import { inspect, promisify } from "util";
import { progress } from "./ui";
import { pipeline, Transform } from "stream";

export const pipelineAsync = promisify(pipeline);

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
    this.output.show(true);
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

export const log = new Log();

export const execFile = promisify(cp.execFile);

export const download = async (
  url: string,
  dest: string,
  abort: AbortController
): Promise<void> => {
  return progress(
    `Downloading ${path.basename(dest)}`,
    abort,
    async (progress) => {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok || response.body === null) {
        throw new Error(`Can't fetch ${url}: ${response.statusText}`);
      }

      const size = Number(response.headers.get("content-length")) || 0;
      let read = 0;
      const out = fs.createWriteStream(dest);

      const progressStream = new Transform({
        transform(chunk, _, callback) {
          read += chunk.length;
          if (size > 0) {
            progress(read / size);
          }
          callback(null, chunk);
        },
      });

      try {
        await pipelineAsync(response.body, progressStream, out);
      } catch (e) {
        fs.unlink(dest, (_) => null);
        throw e;
      }
    }
  );
};
