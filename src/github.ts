import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pipeline, Transform } from "node:stream";

import { promisify } from "node:util";
import * as vscode from "vscode";
import { progress } from "./progress";

/**
 * @file Provides utilities for fetching the Buf CLI release and release metadata from GitHub.
 */

/**
 * The GitHub release URL for the Buf CLI.
 */
const githubReleaseURL = "https://api.github.com/repos/bufbuild/buf/releases/";

/**
 * Release is a GitHub release for the Buf CLI.
 */
export interface Release {
  name: string;
  tag_name: string;
  assets: Array<Asset>;
}

/**
 * Asset is a specific asset of a Release for the Buf CLI.
 */
export interface Asset {
  name: string;
  url: string;
}

/**
 * Fetch the metadata for the specified release.
 */
export const getRelease = async (tag: string): Promise<Release> => {
  let releaseUrl = `${githubReleaseURL}${tag}`;
  if (tag !== "latest") {
    releaseUrl = `${githubReleaseURL}tags/${tag}`;
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => {
    timeoutController.abort();
  }, 5000);
  try {
    const authToken = await getAuthToken();
    const headers = new Headers();

    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    const response = await fetch(releaseUrl, {
      signal: timeoutController.signal,
      headers: headers,
    });
    if (!response.ok) {
      console.error(response.url, response.status, response.statusText);
      throw new Error(`Can't fetch release '${tag}': ${response.statusText}`);
    }
    return (await response.json()) as Release;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Determine which release asset should be installed for this machine.
 */
export const findAsset = async (release: Release): Promise<Asset> => {
  const platforms: { [key: string]: string } = {
    darwin: "Darwin",
    linux: "Linux",
    win32: "Windows",
  };

  const platform = platforms[os.platform()];

  let arch: string = os.arch();

  if (arch === "x86" || arch === "x64") {
    arch = "x86_64";
  } else if (arch === "arm64" && platform === "Linux") {
    arch = "aarch64";
  }

  let platformKey = `buf-${platform}-${arch}`;

  if (platform === "Windows") {
    platformKey += ".exe";
  }

  const asset = release.assets.find((a) => a.name === platformKey);
  if (asset) {
    return asset;
  }

  throw new Error(
    `No buf ${release.name} binary available, looking for '${platformKey}'`
  );
};

const pipelineAsync = promisify(pipeline);

/**
 * Download the specified asset.
 */
export const download = async (
  asset: Asset,
  dest: string,
  abort: AbortController
): Promise<void> => {
  return progress(
    `Downloading ${path.basename(dest)}`,
    abort,
    async (progress) => {
      const response = await fetch(asset.url, {
        signal: abort.signal,
        headers: {
          Accept: "application/octet-stream",
        },
      });
      if (!response.ok || response.body === null) {
        throw new Error(`Can't fetch ${asset.url}: ${response.statusText}`);
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

/**
 * A helper for getting the GitHub auth token, if available.
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession("github", [], {
      createIfNone: false,
    });
    if (session) {
      return session.accessToken;
    }
  } catch {
    // Ignore errors, extension may be disabled.
  }
  return undefined;
}
