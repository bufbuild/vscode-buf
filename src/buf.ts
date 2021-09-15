import * as child_process from "child_process";
import { Error } from "./errors";
import { parse, Version } from "./version";

// Don't defined latest version right now, adds a lot
// of overhead to maintain.
/*
export const latestVersion = {
  major: 0,
  minor: 56,
  patch: 0,
};
*/

export const minimumVersion = {
  major: 0,
  // 0.34.0 was when we moved "buf check lint" to "buf lint"
  // https://github.com/bufbuild/buf/releases/tag/v0.34.0
  minor: 34,
  patch: 0,
};

export const downloadPage = "https://docs.buf.build/installation";

export const lint = (
  binaryPath: string,
  filePath: string,
  cwd: string
): string[] | Error => {
  const output = child_process.spawnSync(
    binaryPath,
    ["lint", "--path", filePath, "--error-format=json"],
    {
      encoding: "utf-8",
      cwd: cwd,
    }
  );
  if (output.error !== undefined) {
    return { errorMessage: output.error.message };
  }
  if (output.status !== null && output.status === 0) {
    return [];
  }
  return output.stdout.trim().split("\n");
};

export const version = (binaryPath: string): Version | Error => {
  const output = child_process.spawnSync(binaryPath, ["--version"], {
    encoding: "utf-8",
  });
  if (output.error !== undefined) {
    return { errorMessage: output.error.message };
  }
  return parse(output.stdout.trim());
};
