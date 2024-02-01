import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    label: "unitTests",
    files: "out/test/**/*.test.js",
    workspaceFolder: "./test-workspaces/npm-buf-workspace",
  },
]);
