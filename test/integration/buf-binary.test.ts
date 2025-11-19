import assert from "node:assert";
import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { promisify } from "node:util";
import { effect } from "@preact/signals-core";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import which from "which";
import { githubReleaseURL, type Release } from "../../src/github";
import { bufState } from "../../src/state";
import type { LanguageServerStatus } from "../../src/status";

/**
 * The test asset download URL. We use a single test download URL for all assets so that
 * tests are consistent across platforms.
 */
const assetDownloadURL =
  "https://api.github.com/repos/bufbuild/buf/releases/assets/";
const downloadBinPath = "test/workspaces/empty-single/node_modules/@bufbuild/";

/**
 * msw stub handlers for GitHub releases API.
 */
const handlers = [
  http.get(`${githubReleaseURL}latest`, () => {
    return HttpResponse.json({
      name: "v1.54.0",
      tag_name: "v1.54.0",
      assets: [
        {
          name: "buf-Darwin-arm64",
          url: `${assetDownloadURL}buf-darwin-arm64`,
        },
        {
          name: "buf-Darwin-x86_64",
          url: `${assetDownloadURL}buf-darwin-x64`,
        },
        {
          name: "buf-Linux-x86_64",
          url: `${assetDownloadURL}buf-linux-x64`,
        },
        {
          name: "buf-Linux-aarch64",
          url: `${assetDownloadURL}buf-linux-aarch64`,
        },
        {
          name: "buf-Windows-x86_64.exe",
          url: `${assetDownloadURL}buf-win32-x64`,
        },
        {
          name: "buf-Windows-arm64.exe",
          url: `${assetDownloadURL}buf-win32-arm64`,
        },
      ],
    } satisfies Release);
  }),
  http.get(`${assetDownloadURL}:platformKey`, ({ params }) => {
    try {
      const bin = fs.readFileSync(
        os.platform() === "win32"
          ? path.resolve(
              __dirname,
              `../../../${downloadBinPath}${params.platformKey}/bin/buf.exe`
            )
          : `${downloadBinPath}${params.platformKey}/bin/buf`
      );
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bin);
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: {
          "content-type": "application/octet-stream",
        },
      });
    } catch (e) {
      return HttpResponse.json({ error: e }, { status: 404 });
    }
  }),
];

const server = setupServer(...handlers);

/**
 * Wraps {@link cp.exec} into an async call.
 */
const exec = promisify(cp.exec);

suite("manage buf binary and LSP", () => {
  suiteSetup(async () => {
    server.listen();
  });

  suiteTeardown(async () => {
    server.close();
  });

  teardown(async () => {
    server.resetHandlers();
  });

  test(`setup buf ${process.env.BUF_INSTALLED}`, async () => {
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();
    await languageServerRunning;
    if (process.env.BUF_INSTALLED === "1") {
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
      assert.ok(
        path.matchesGlob(
          bufBinaryPath,
          `**/.vscode-test/user-data/User/globalStorage/bufbuild.vscode-buf/v1.54.0/buf*`
        )
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
  const dispose = effect(() => {
    const languageServerStatus = bufState.getLanguageServerStatus();
    if (languageServerStatus === listenFor) {
      resolve();
      dispose();
    }
    if (languageServerStatus === "LANGUAGE_SERVER_ERRORED") {
      reject(
        new Error(`language server in failed state: ${languageServerStatus}`)
      );
      dispose();
    }
  });
  return promise;
}
