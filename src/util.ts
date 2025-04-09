import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

import { promisify } from "util";
import { progress } from "./ui";
import { pipeline, Transform } from "stream";

export const pipelineAsync = promisify(pipeline);

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
