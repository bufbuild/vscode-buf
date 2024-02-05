/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as vscode from "vscode";
import * as buf from "../buf";
import { getBinaryPath } from "../get-binary-path";
import path from "path";

suite("Buf CLI tests", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Default path succeeds when buf is installed", async () => {
    const version = buf.version("buf");
    if ("errorMessage" in version) {
      assert.fail(version.errorMessage);
    } else {
      assert.ok(version.major >= 1);
    }
  });

  test("Relative path loaded from config", async () => {
    const { binaryPath } = getBinaryPath();
    assert.ok(binaryPath);
    const version = buf.version(binaryPath);
    if ("errorMessage" in version) {
      assert.fail(version.errorMessage);
    } else {
      assert.ok(version.major >= 1);
    }
  });

  suite("Absolute config path", () => {
    let storedPath: string | undefined;

    setup(() => {
      const { cwd } = getBinaryPath();
      storedPath = vscode.workspace
        .getConfiguration("buf")
        .get<string>("binaryPath");
      vscode.workspace
        .getConfiguration("buf")
        .update(
          "binaryPath",
          path.join(cwd ?? "", "./node_modules", ".bin", "buf")
        );
    });

    teardown(() => {
      vscode.workspace.getConfiguration("buf").update("binaryPath", storedPath);
    });

    test("version", async () => {
      const { binaryPath } = getBinaryPath();
      assert.ok(binaryPath);
      const version = buf.version(binaryPath);
      if ("errorMessage" in version) {
        assert.fail(version.errorMessage);
      } else {
        assert.ok(version.major >= 1);
      }
    });
  });
});
