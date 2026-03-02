/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: We use curly braces to test VS Code variable expansion */
import assert from "node:assert";
import { homedir } from "node:os";
import * as path from "node:path";
import { expandPathVariables } from "../../src/util";

suite("expandPathVariables", () => {
  const folder = "/workspace/myproject";

  test("${workspaceFolder} is expanded", () => {
    assert.strictEqual(
      expandPathVariables("${workspaceFolder}/tools/buf", folder),
      `${folder}/tools/buf`
    );
  });

  test("${workspaceRoot} is expanded (alias for ${workspaceFolder})", () => {
    assert.strictEqual(
      expandPathVariables("${workspaceRoot}/tools/buf", folder),
      `${folder}/tools/buf`
    );
  });

  test("${workspaceFolderBasename} is expanded", () => {
    assert.strictEqual(
      expandPathVariables("${workspaceFolderBasename}/tools/buf", folder),
      `${path.basename(folder)}/tools/buf`
    );
  });

  test("~ at the start is expanded to home directory", () => {
    assert.strictEqual(
      expandPathVariables("~/.local/bin/buf", folder),
      `${homedir()}/.local/bin/buf`
    );
  });

  test("~ in the middle of a path is not expanded", () => {
    assert.strictEqual(expandPathVariables("/foo/~/buf", folder), "/foo/~/buf");
  });

  test("plain relative path is unchanged", () => {
    assert.strictEqual(expandPathVariables("tools/buf", folder), "tools/buf");
  });

  test("plain absolute path is unchanged", () => {
    assert.strictEqual(
      expandPathVariables("/usr/local/bin/buf", folder),
      "/usr/local/bin/buf"
    );
  });

  test("unknown variables are left as-is", () => {
    assert.strictEqual(
      expandPathVariables("${unknown}/buf", folder),
      "${unknown}/buf"
    );
  });
});
