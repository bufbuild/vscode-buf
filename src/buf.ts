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

// 1.0.0-rc6 is when we added the proto file input reference
// https://github.com/bufbuild/buf/releases/tag/v1.0.0-rc6
export const minimumVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  releaseCandidate: 6,
};

export const downloadPage = "https://docs.buf.build/installation";

export const lint = (
  binaryPath: string,
  filePath: string,
  cwd: string
): string[] | Error => {
  const output = child_process.spawnSync(
    binaryPath,
    ["lint", filePath + "#include_package_files=true", "--error-format=json"],
    {
      encoding: "utf-8",
      cwd: cwd,
      shell: process.platform === "win32",
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
    shell: process.platform === "win32",
  });
  if (output.error !== undefined) {
    return { errorMessage: output.error.message };
  }
  if (output.stderr.trim() !== "") {
    return parse(output.stderr.trim());
  }
  return parse(output.stdout.trim());
};
