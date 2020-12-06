import * as child_process from "child_process";
import { Error } from "./errors";

export const lint = (
  binaryPath: string,
  filePath: string,
  cwd: string
): string[] | Error => {
  const output = child_process.spawnSync(
    binaryPath,
    ["check", "lint", "--path", filePath, "--error-format=json"],
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
