import assert from "node:assert";
import * as cp from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import which from "which";
import { bufState } from "../../src/state";
import { setupIntegrationTests } from "./setup";

/**
 * Wraps {@link cp.exec} into an async call.
 */
const exec = promisify(cp.exec);

suite("manage buf binary and LSP", () => {
  suiteSetup(async function () {
    this.timeout(10000);
    // Use shared setup to ensure extension is activated and LSP is ready
    await setupIntegrationTests();
  });

  test(`setup buf ${process.env.BUF_INSTALLED}`, async () => {
    // This value is set in the GitHub Actions testing workflow
    if (process.env.BUF_INSTALLED === "buf-on-path") {
      // We expected buf to be installed on the system $PATH and for that to be used.
      const { stdout, stderr } = await exec("buf --version");
      assert.strictEqual(stderr, "");
      const bufFilename = os.platform() === "win32" ? "buf.exe" : "buf";
      const bufPath = await which(bufFilename, { nothrow: true });
      const installedBufBinaryPath = bufState.getBufBinaryPath();
      assert.ok(installedBufBinaryPath);
      assert.strictEqual(bufPath, installedBufBinaryPath);
      const bufBinaryVersion = bufState.getBufBinaryVersion();
      assert.ok(bufBinaryVersion);
      assert.strictEqual(bufBinaryVersion.compare(stdout), 0);
    } else {
      // We expect no buf CLI in the $PATH and the installation flow to trigger.
      const bufBinaryPath = bufState.getBufBinaryPath();
      assert.ok(bufBinaryPath);
      const bufBinaryVersion = bufState.getBufBinaryVersion();
      assert.ok(bufBinaryVersion);
      // Check that buf was installed to the extension's global storage
      assert.ok(
        path.matchesGlob(
          bufBinaryPath,
          `**/.vscode-test/user-data/User/globalStorage/bufbuild.vscode-buf/v${bufBinaryVersion}/buf*`
        ),
        `Expected buf binary at ${bufBinaryPath} to match global storage pattern`
      );
    }
  });
});
