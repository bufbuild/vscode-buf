import { Error, Result } from "./error";

/** A version number. */
export class Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly releaseCandidate: number | null;

  constructor(major: number, minor: number, patch: number, releaseCandidate: number | null = null) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.releaseCandidate = releaseCandidate;
  }

  private static regex = /^(\d+)\.(\d+).(\d+)(?:\-dev|\-rc)?(\d*)?$/;

  /** Parses a version string. */
  static parse(from: string): Result<Version> {
    let match = from.match(this.regex);
    if (match === null || match.length < 4) {
      return new Error(`failed to parse version output: ${from}`)
    }

    let major = parseInt(match[1]);
    if (Number.isNaN(major)) {
      return new Error(`failed to parse major version: ${from}`)
    }

    let minor = parseInt(match[2]);
    if (Number.isNaN(minor)) {
      return new Error(`failed to parse minor version: ${from}`)
    }

    let patch = parseInt(match[3]);
    if (Number.isNaN(patch)) {
      return new Error(`failed to parse patch version: ${from}`)
    }

    let releaseCandidate: number | null = parseInt(match[4]);
    if (Number.isNaN(releaseCandidate)) {
      // If there is no release candidate number, we explicitly unset it.
      releaseCandidate = null;
    }

    return new Version(major, minor, patch, releaseCandidate);
  }

  /** Compares two versions for ordering. */
  olderThan(that: Version): boolean {
    if (this.major < that.major) return true;
    if (this.major === that.major && this.minor < that.minor) return true;
    if (this.major === that.major && this.minor === that.minor && this.patch < that.patch) return true;

    return this.major === that.major &&
      this.minor === that.minor &&
      this.patch === that.patch &&
      this.releaseCandidate !== null && (
        that.releaseCandidate === null ||
        this.releaseCandidate < that.releaseCandidate
      );
  }

  /** Converts this version back into a string. */
  toString(): string {
    let str = `v${this.major}.${this.minor}.${this.patch}`;

    if (this.releaseCandidate !== null) {
      return `${str}-rc${this.releaseCandidate}`;
    }
    return str;
  }
}