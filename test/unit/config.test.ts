import * as vscode from "vscode";
import * as config from "../../src/config";

import assert from "assert";
import { homedir } from "os";

suite("config", () => {
  // These buf.* config keys and types are setup in test/workspaces/unit/package.json.
  const settings = {
    // The top-level keys are in test/workspaces/unit/.vscode/settings.json, these are meant
    // to emulate configuration keys outside of the extension. We expected our config.<get,update>
    // to always return undefined for top-level keys because config.<get,update> are scoped
    // to "buf" keys only. However, we expect config replacements to read top-level keys.
    "top.foo": undefined,

    // buf.* keys
    "buf.foo": "bar",
    "buf.home": "${userHome}",
    "buf.cwd": "${cwd}",
    "buf.env": "${env:TEST_ENV}",
    "buf.config": "${config:top.foo}",
    "buf.nested_config": "${config:buf.foo}",
    "buf.fake_substitution": "${fake}",
    "buf.array": ["foo", "bar", "baz"],
    "buf.array_substitution": ["${env:TEST_ENV}", "${config:top.foo}", "foo"],
    "buf.object": { foo: "bar" },
    "buf.object_substitution": {
      "${env:TEST_ENV}": "${config:buf.foo}",
      foo: "bar",
      baz: "${env:TEST_ENV}",
    },
  };
  suiteSetup(async () => {
    for (const [key, expected] of Object.entries(settings)) {
      if (!key.startsWith("buf.")) {
        // No need to add these keys.
        continue;
      }
      await vscode.workspace.getConfiguration().update(key, expected);
    }
  });
  suiteTeardown(async () => {
    for (const key of Object.keys(settings)) {
      if (!key.startsWith("buf.")) {
        continue;
      }
      await vscode.workspace.getConfiguration().update(key, undefined);
    }
  });
  test("get keys", () => {
    for (const [key, expected] of Object.entries(settings)) {
      if (!key.startsWith("buf.")) {
        // Not a "buf"-prefixed value, we expect this to not return a value with our config
        // library get implementation
        assert.strictEqual(config.get(key), expected);
        continue;
      }
      const value = config.get(key.replace("buf.", ""));
      if (typeof expected === "string") {
        if (expected.match(/\$\{.*?\}/g)) {
          switch (expected) {
            case "${userHome}":
              assert.strictEqual(value, homedir());
              break;
            case "${cwd}":
              assert.strictEqual(value, process.cwd());
              break;
            case "${env:TEST_ENV}":
              // We use an explicit env var set in our test suite workspace, TEST_ENV:env_replacement
              assert.strictEqual(value, "env_replacement");
              break;
            case "${config:top.foo}":
              assert.strictEqual(value, "top_bar");
              break;
            case "${config:buf.foo}":
              assert.strictEqual(value, config.get("foo"));
              break;
            default:
              // If there is no replacement found in our library, we expect the same value back
              assert.strictEqual(value, expected);
          }
          continue;
        }
        assert.strictEqual(value, expected);
        continue;
      }
      if (key.endsWith("_substitution")) {
        switch (key) {
          case "buf.array_substitution":
            assert.deepStrictEqual(value, [
              "env_replacement",
              "top_bar",
              "foo",
            ]);
            break;
          case "buf.object_substitution":
            assert.deepStrictEqual(value, {
              // The key never gets substituted
              "${env:TEST_ENV}": "bar",
              foo: "bar",
              baz: "env_replacement",
            });
            break;
        }
        continue;
      }
      assert.deepStrictEqual(value, expected);
    }
  });
});
