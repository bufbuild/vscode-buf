import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getBufBinaryFromPath } from "../../src/state";

// These tests use shell scripts and only apply on Unix platforms where asdf runs.
suite("getBufBinaryFromPath", () => {
  suiteSetup(function () {
    if (os.platform() === "win32") {
      this.skip();
    }
  });

  let tmpDir: string;

  setup(() => {
    // Resolve symlinks so that $PWD in scripts matches what we pass as cwd.
    // On macOS, os.tmpdir() returns /var/... but the real path is /private/var/...
    tmpDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "vscode-buf-test-"))
    );
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("parses version from stdout", async () => {
    const script = path.join(tmpDir, "buf");
    fs.writeFileSync(script, "#!/bin/sh\necho 1.47.2\n");
    fs.chmodSync(script, 0o755);

    const binary = await getBufBinaryFromPath(script);
    assert.strictEqual(binary.version.toString(), "1.47.2");
    assert.strictEqual(binary.path, script);
  });

  test("strips trailing ~patchlevel from version", async () => {
    const script = path.join(tmpDir, "buf");
    fs.writeFileSync(script, "#!/bin/sh\necho 1.47.2~custom\n");
    fs.chmodSync(script, 0o755);

    const binary = await getBufBinaryFromPath(script);
    assert.strictEqual(binary.version.toString(), "1.47.2");
  });

  test("passes cwd to the subprocess", async () => {
    // This script simulates an asdf-style shim: it outputs a version only when
    // run in the expected directory, and fails otherwise — verifying that the
    // cwd option is forwarded to execFile.
    const expectedDir = path.join(tmpDir, "workspace");
    fs.mkdirSync(expectedDir);

    const script = path.join(tmpDir, "buf");
    fs.writeFileSync(
      script,
      // Use single-quotes around the path so it's treated as a literal string.
      `#!/bin/sh\nif [ "$PWD" = '${expectedDir}' ]; then echo 1.47.2; else echo "Wrong cwd: $PWD" >&2; exit 1; fi\n`
    );
    fs.chmodSync(script, 0o755);

    // Succeeds when the correct cwd is provided.
    const binary = await getBufBinaryFromPath(script, expectedDir);
    assert.strictEqual(binary.version.toString(), "1.47.2");

    // Fails when a different cwd is provided.
    await assert.rejects(
      getBufBinaryFromPath(script, tmpDir),
      /Command failed/
    );
  });
});
