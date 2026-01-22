import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@vscode/test-cli";

/**
 * Integration test configs.
 *
 * VS Code version defaults to stable.
 */
export default defineConfig([
  {
    labels: "unit",
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
    labels: "integrationEmptySingleRootWorkspace",
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/empty-single",
    launchArgs: ["--disable-extensions"],
  },
  {
    labels: "integrationMixedMultiRootWorkspace",
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/multi/multi.code-workspace",
    launchArgs: ["--disable-extensions"],
  },
]);
