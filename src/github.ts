import * as os from "os";
import * as vscode from "vscode";

import { githubReleaseURL } from "./const";

export interface Release {
  name: string;
  tag_name: string;
  assets: Array<Asset>;
}
export interface Asset {
  name: string;
  browser_download_url: string;
}

// Fetch the metadata for the latest stable release.
export const getRelease = async (tag?: string): Promise<Release> => {
  const releaseUrl = `${githubReleaseURL}${tag ? `tags/${tag}` : "latest"}`;

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
      throw new Error(
        `Can't fetch release '${tag ? tag : "latest"}': ${response.statusText}`
      );
    }
    return (await response.json()) as Release;
  } finally {
    clearTimeout(timeout);
  }
};

// Determine which release asset should be installed for this machine.
export const findAsset = async (release: Release): Promise<Asset> => {
  const platforms: { [key: string]: string } = {
    darwin: "Darwin",
    linux: "Linux",
    win32: "Windows",
  };

  const platform = platforms[os.platform()];

  let arch = os.arch();

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

const getAuthToken = async (): Promise<string | undefined> => {
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
};
