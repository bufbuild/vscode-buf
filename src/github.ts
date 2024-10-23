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