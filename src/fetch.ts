import * as fs from "fs";
import * as path from "path";
import * as stream from "stream";
import * as ui from "./ui";

import { AbortController } from "abort-controller";
import { Result } from "./error";
import { promisify } from "util";

// eslint-disable-next-line no-new-func
const importDynamic = new Function('m', 'return import(m)');

// Work around the fact that fetch cannot be imported directly due to module incompatibility. 
// https://stackoverflow.com/questions/70142391/importing-node-fetch-in-node-project-with-typescript
const fetch_ = async (...args: any[]) => {
  return (await importDynamic('node-fetch')).default(...args);
};

/**
 * Fetches a JSON blob from somewhere.
 */
export async function fetchJSON(url: string, abort: AbortController): Promise<Result<any>> {
  return ui.progress(`Fetching ${url}`, abort, async (progress) => {
    let response = await fetch_(url, {signal: abort.signal});

    if (!response.ok) {
      return new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    let size = Number(response.headers.get('content-length'));
    let read = 0;
    response.body!.on('data', (chunk: Buffer) => {
      read += chunk.length;
      progress(read / size);
    });

    return await response.json();
  });
}

/**
 * Downloads a file from a URL to the given local destination path.
 */
export async function download(url: string, dest: string, abort: AbortController): Promise<Result<void>> {
  return ui.progress(`Downloading ${url}`, abort, async (progress) => {
    let response = await fetch_(url, {signal: abort.signal});

    if (!response.ok) {
      return new Error(`Failed to download ${url}: ${response.statusText}`);
    }

    let size = Number(response.headers.get('content-length'));
    let read = 0;
    response.body!.on('data', (chunk: Buffer) => {
      read += chunk.length;
      progress(read / size);
    });

    const out = fs.createWriteStream(dest);
    await promisify(stream.pipeline)(response.body, out).catch(e => {
      // Clean up the partial file if the download failed.
      fs.unlink(dest, (_) => null); // Don't wait, and ignore error.
      throw e;
    });

    return;
  });
}