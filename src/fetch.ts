// Copyright 2020-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as fs from "fs";
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
  let response = await fetch_(url, {signal: abort.signal});

  if (!response.ok) {
    return new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Downloads a file from a URL to the given local destination path.
 * This will also show a progress bar to the client.
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
      fs.unlink(dest, (_) => null);
      throw e;
    });

    return;
  });
}