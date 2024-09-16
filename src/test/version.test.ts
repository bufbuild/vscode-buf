/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as vscode from "vscode";

import { Error } from "../error";
import { Version } from "../version";

suite("Version Test Suite", () => {
  vscode.window.showInformationMessage("Start all version tests.");

  test("Parses simple version successfully", () => {
    const result = Version.parse("0.33.0");
    const want = new Version(0, 33, 0);
    assert.deepStrictEqual(result, want);
  });

  test("Parses dev version successfully", () => {
    const result = Version.parse("1.34.15-dev");
    const want = new Version(1, 34, 5);
    assert.deepStrictEqual(result, want);
  });

  test("Parses rc version successfully", () => {
    const result = Version.parse("1.34.15-rc1");
    const want = new Version(1, 34, 5, 1);
    assert.deepStrictEqual(result, want);
  });

  test("Orders major versions successfully", () => {
    let v1 = new Version(1, 0, 0);
    let v2 = new Version(0, 1, 2);
    assert.ok(!v1.olderThan(v2));
    assert.ok(v2.olderThan(v1));
  });

  test("Orders minor versions successfully", () => {
    let v1 = new Version(0, 2, 0);
    let v2 = new Version(0, 1, 2);
    assert.ok(!v1.olderThan(v2));
    assert.ok(v2.olderThan(v1));
  });

  test("Orders patch versions successfully", () => {
    let v1 = new Version(1, 1, 1);
    let v2 = new Version(1, 1, 0);
    assert.ok(!v1.olderThan(v2));
    assert.ok(v2.olderThan(v1));
  });

  test("Orders release candidate versions successfully", () => {
    let v1 = new Version(1, 1, 0, 2);
    let v2 = new Version(1, 1, 0, 1);
    assert.ok(!v1.olderThan(v2));
    assert.ok(v2.olderThan(v1));
  });

  test("Orders release candidate vs. non-release candidate versions successfully", () => {
    let v1 = new Version(1, 1, 0);
    let v2 = new Version(1, 1, 0, 1);
    assert.ok(!v1.olderThan(v2));
    assert.ok(v2.olderThan(v1));
  });

  test("Orders equal versions successfully", () => {
    let v1 = new Version(1, 1, 1);
    assert.ok(!v1.olderThan(v1));
  });

  test("Formats versions successfully", () => {
    assert.strictEqual(new Version(1, 34, 15).toString(), "v1.34.15");
  });

  test("Returns error for invalid version", () => {
    const result = Version.parse("not-a-version");
    assert.ok(result instanceof Error);
  });
});
