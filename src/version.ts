import * as semver from "semver";
import * as github from "./github";

import { execFile } from "./util";

const loose: semver.Options = {
  loose: true,
};

export class BufVersion {
  constructor(public readonly path: string, public readonly version: semver.Range) {}

  static async fromPath(path: string): Promise<BufVersion> {
    const version = await getBufVersion(path);
    return new BufVersion(path, version);
  }

  async hasUpgrade(release: github.Release) {
    const releasedVer = getReleaseVersion(release);
    return {
      old: this.version.raw,
      new: releasedVer.raw,
      upgrade: rangeGreater(releasedVer, this.version),
    };
  }
}

export const getBufVersion = async (bufPath: string): Promise<semver.Range> => {
  const { stdout, stderr } = await execFile(bufPath, ["--version"]);

  if (stderr) {
    throw new Error(`Error getting version of '${bufPath}'! ${stderr}`);
  }

  // Some vendors add trailing ~patchlevel, ignore this.
  const rawVersion = stdout.trim().split(/\s|~/, 1)[0];

  if (!rawVersion) {
    throw new Error(`Unable to determine version of '${bufPath}'!`);
  }

  return new semver.Range(rawVersion, loose);
};

// Get the version of a github release, by parsing the tag or name.
const getReleaseVersion = (release: github.Release): semver.Range => {
  // Prefer the tag name, but fall back to the release name.
  return !semver.validRange(release.tag_name, loose) && semver.validRange(release.name, loose)
    ? new semver.Range(release.name, loose)
    : new semver.Range(release.tag_name, loose);
};

const rangeGreater = (newVer: semver.Range, oldVer: semver.Range) => {
  const minVersion = semver.minVersion(newVer);
  if (minVersion === null) {
    throw new Error(`Couldn't parse version range: ${newVer}`);
  }
  return semver.gtr(minVersion, oldVer);
};
