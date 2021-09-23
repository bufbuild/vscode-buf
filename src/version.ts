import { Error } from "./errors";

const versionRegexp = /^(\d+)\.(\d+).(\d+)(-dev|-rc\d*)?$/;

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export const less = (first: Version, second: Version): boolean => {
  if (first.major < second.major) {
    return true;
  }
  if (first.major === second.major && first.minor < second.minor) {
    return true;
  }
  return (
    first.major === second.major &&
    first.minor === second.minor &&
    first.patch < second.patch
  );
};

export const format = (version: Version): string => {
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
  return {
    major: major,
    minor: minor,
    patch: patch,
  };
};
