import assert from "node:assert";
import * as cp from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { effect } from "@preact/signals-core";
import * as vscode from "vscode";
import which from "which";
import { bufState } from "../../src/state";
import type { LanguageServerStatus } from "../../src/status";

/**
 * Wraps {@link cp.exec} into an async call.
 */
const exec = promisify(cp.exec);

suite("manage buf binary and LSP", () => {
  test(`setup buf ${process.env.BUF_INSTALLED}`, async () => {
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();
    await languageServerRunning;
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

/**
 * A helper function that returns a Promise listening for the language server status. Once
 * the language server is the status we want to listen for, the promise resolves. If the
 * language server is in an uninstalled or errored state, the Promise rejects.
 */
function setupLanguageServerListener(
  listenFor: LanguageServerStatus
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  let dispose: (() => void) | undefined;
  dispose = effect(() => {
    const languageServerStatus = bufState.getLanguageServerStatus();
    if (languageServerStatus === listenFor) {
      resolve();
      dispose?.();
    }
    if (languageServerStatus === "LANGUAGE_SERVER_ERRORED") {
      reject(
        new Error(`language server in failed state: ${languageServerStatus}`)
      );
      dispose?.();
    }
  });
  return promise;
}
