import * as semver from "semver";

import { execFile } from "./util";

/**
 * @file Provides a class for managing the Buf CLI version used by the extension.
 */

/**
 * BufVersion contains the version information for the Buf CLI used by the extension.
 *
 * @param path is the path of the Buf CLI binary used by the extension.
 * @param version is the
 */
export class BufVersion {
  constructor(
    public readonly path: string,
    public readonly version: semver.SemVer
  ) {}

  static async fromPath(path: string): Promise<BufVersion> {
    const version = await getBufVersion(path);
    return new BufVersion(path, version);
  }
}

/**
 * A helper function for checking the Buf version for the Buf CLI installed at a given path.
 */
async function getBufVersion(bufPath: string): Promise<semver.SemVer> {
  const { stdout, stderr } = await execFile(bufPath, ["--version"]);

  if (stderr) {
    throw new Error(`Error getting version of '${bufPath}'! ${stderr}`);
  }
  // Some vendors add trailing ~patchlevel, ignore this. This is currently not something
  // we do for Buf CLI releases, but this supports custom builds.
  const rawVersion = stdout.trim().split(/\s|~/, 1)[0];
  if (!rawVersion) {
    throw new Error(`Unable to determine version of '${bufPath}'!`);
  }
  return new semver.SemVer(rawVersion);
}
