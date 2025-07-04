import * as path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    labels: "unit tests",
    files: "out/test/unit/**.test.js",
    workspaceFolder: "test/workspaces/unit",
    launchArgs: ["--disable-extensions"],
    env: {
      TEST_ENV: "env_replacement",
    },
    extensionDevelopmentPath: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "./test/workspaces/unit"
    ),
  },
  {
    labels: "integration tests - empty, single root workspace",
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/empty-single",
    launchArgs: ["--disable-extensions"],
  },
  {
    labels: "integration tests - activated, single root workspace",
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/single",
    launchArgs: ["--disable-extensions"],
  },
  {
    labels: "integration tests - mixed multi-root workspace",
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/multi/multi.code-workspace",
    launchArgs: ["--disable-extensions"],
  },
]);
