import { Error } from "./errors";

const versionRegexp = /^(\d+)\.(\d+).(\d+)(?:\-dev|\-rc)?(\d*)?$/;

export interface Version {
  major: number;
  minor: number;
  patch: number;
  // Not all versions will have release candidates. We will deliberately set the release
  // candidate to null if none are found, and that version takes precedence over the
  // release candidates.
  releaseCandidate: number | null;
}

export const less = (first: Version, second: Version): boolean => {
  if (first.major < second.major) {
    return true;
  }
  if (first.major === second.major && first.minor < second.minor) {
    return true;
  }
  if (
    first.major === second.major &&
    first.minor === second.minor &&
    first.patch < second.patch
  ) {
    return true;
  }
  return (
    first.major === second.major &&
    first.minor === second.minor &&
    first.patch === second.patch &&
    checkReleaseCandidate(first.releaseCandidate, second.releaseCandidate)
  );
};

export const format = (version: Version): string => {
  if (version.releaseCandidate !== null) {
    return `v${version.major}.${version.minor}.${version.patch}-rc${version.releaseCandidate}`;
  }
  return `v${version.major}.${version.minor}.${version.patch}`;
};

export const parse = (versionString: string): Version | Error => {
  const match = versionString.match(versionRegexp);
  if (match === null || match.length < 4) {
    return {
      errorMessage: `failed to parse version output: ${versionString}`,
    };
  }
  const major = parseInt(match[1]);
  if (Number.isNaN(major)) {
    return {
      errorMessage: "failed to parse major version",
    };
  }
  const minor = parseInt(match[2]);
  if (Number.isNaN(minor)) {
    return {
      errorMessage: "failed to parse minor version",
    };
  }
  const patch = parseInt(match[3]);
  if (Number.isNaN(patch)) {
    return {
      errorMessage: "failed to parse patch version",
    };
  }
  let releaseCandidate: number | null = parseInt(match[4]);
  if (Number.isNaN(releaseCandidate)) {
    // If there is no release candidate number, we explicitly unset it.
    releaseCandidate = null;
  }
  return {
    major: major,
    minor: minor,
    patch: patch,
    releaseCandidate: releaseCandidate,
  };
};

export const checkReleaseCandidate = (
  firstReleaseCandidate: number | null,
  secondReleaseCandidate: number | null
): boolean => {
  if (firstReleaseCandidate === null) {
    return false;
  }
  if (secondReleaseCandidate === null) {
    return true;
  }
  return firstReleaseCandidate < secondReleaseCandidate;
};
