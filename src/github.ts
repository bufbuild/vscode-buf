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

import * as fetch from "./fetch";

import { Error, Result } from "./error";

import AbortController from 'abort-controller';

export interface Release {
  name: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  tag_name: string,
  assets: Array<Asset>,
}

export interface Asset {
  name: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  browser_download_url: string,
}

/**
 * Fetches a release from GitHub.
 */
export async function release(org: string, repo: string, release: string): Promise<Result<Release>> {
  let timeoutController = new AbortController();
  setTimeout(() => { timeoutController.abort(); }, 5000);

  let json = await fetch.fetchJSON(
    `https://api.github.com/repos/${org}/${repo}/releases/${release}`,
    timeoutController,
  );
  if (json instanceof Error) {
    return json;
  }
  return json as Release;
}