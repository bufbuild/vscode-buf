import assert from "assert";

import { bufState } from "../../src/state";
import { installBuf } from "../../src/commands/install-buf";

suite("install", () => {
  test("no configs, use system buf on $PATH", () => {});
  test("use path", () => {});
  test("use version config", () => {});
  suiteTeardown(() => {
    // Reset all buf.commandLine.path and buf.commandLine.version configs
    // Stop language server
  });
});
