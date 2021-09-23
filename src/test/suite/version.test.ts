/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as vscode from "vscode";
import * as version from "../../version";

suite("Version Test Suite", () => {
  vscode.window.showInformationMessage("Start all version tests.");

  test("Parses simple version successfully", () => {
    const result = version.parse("0.33.0");
    const want = {
      major: 0,
      minor: 33,
      patch: 0,
    };
    assert.deepStrictEqual(result, want);
  });

  test("Parses dev version successfully", () => {
    const result = version.parse("1.34.15-dev");
    const want = {
      major: 1,
      minor: 34,
      patch: 15,
    };
    assert.deepStrictEqual(result, want);
  });

  test("Parses rc version successfully", () => {
    const result = version.parse("1.34.15-rc1");
    const want = {
      major: 1,
      minor: 34,
      patch: 15,
    };
    assert.deepStrictEqual(result, want);
  });

  test("Orders major versions successfully", () => {
    const v1 = {
      major: 1,
      minor: 0,
      patch: 0,
    };
    const v2 = {
      major: 0,
      minor: 1,
      patch: 2,
    };
    assert.strictEqual(version.less(v1, v2), false);
    assert.strictEqual(version.less(v2, v1), true);
  });

  test("Orders minor versions successfully", () => {
    const v1 = {
      major: 0,
      minor: 2,
      patch: 0,
    };
    const v2 = {
      major: 0,
      minor: 1,
      patch: 1,
    };
    assert.strictEqual(version.less(v1, v2), false);
    assert.strictEqual(version.less(v2, v1), true);
  });

  test("Orders patch versions successfully", () => {
    const v1 = {
      major: 1,
      minor: 1,
      patch: 1,
    };
    const v2 = {
      major: 1,
      minor: 1,
      patch: 0,
    };
    assert.strictEqual(version.less(v1, v2), false);
    assert.strictEqual(version.less(v2, v1), true);
  });

  test("Orders equal versions successfully", () => {
    const v1 = {
      major: 1,
      minor: 1,
      patch: 1,
    };
    assert.strictEqual(version.less(v1, v1), false);
  });

  test("Formats versions successfully", () => {
    const v1 = {
      major: 1,
      minor: 34,
      patch: 15,
    };
    const result = version.format(v1);
    assert.strictEqual(result, "v1.34.15");
  });

  test("Returns error for invalid version", () => {
    const result = version.parse("not-a-version");
    const want = {
      errorMessage: "failed to parse version output: not-a-version",
    };
    assert.deepStrictEqual(result, want);
  });
});
