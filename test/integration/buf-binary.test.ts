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
import { stopLanguageServer } from "../../src/commands/stop-lsp";
import * as config from "../../src/config";
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
  http.get(`${githubReleaseURL}tags/:tag`, ({ params }) => {
    if (typeof params.tag !== "string") {
      return HttpResponse.json({ error: params.tag }, { status: 404 });
    }
    return HttpResponse.json({
      name: params.tag,
      tag_name: params.tag,
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
    await config.update("commandLine.path", undefined);
    await config.update("commandLine.version", undefined);
  });

  teardown(async () => {
    // Reset the state of the extension after each test case
    await stopLanguageServerForTest();
    if (config.get("commandLine.path")) {
      const languageServerRunning = setupLanguageServerListener(
        "LANGUAGE_SERVER_RUNNING"
      );
      await config.update("commandLine.path", undefined);
      await languageServerRunning;
      await stopLanguageServerForTest();
    }
    if (config.get("commandLine.version")) {
      const languageServerRunning = setupLanguageServerListener(
        "LANGUAGE_SERVER_RUNNING"
      );
      await config.update("commandLine.version", undefined);
      await languageServerRunning;
      await stopLanguageServerForTest();
    }
    server.resetHandlers();
  });

  test("no configs, use system buf on $PATH", async () => {
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );
    // Must activate the extension as part of the test
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();
    await languageServerRunning;
    const { stdout, stderr } = await exec("buf --version");
    assert.strictEqual(stderr, "");
    const bufBinaryVersion = bufState.getBufBinaryVersion();
    assert.ok(bufBinaryVersion);
    assert.strictEqual(bufBinaryVersion.compare(stdout), 0);
    const bufFilename = os.platform() === "win32" ? "buf.exe" : "buf";
    const bufPath = await which(bufFilename, { nothrow: true });
    assert.strictEqual(bufPath, bufState.getBufBinaryPath());
  });

  test("configure commandLine.path", async () => {
    // Setup a listener for the language server status
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );
    let configPath = "node_modules/.bin/buf";
    if (os.platform() === "win32") {
      configPath = path.resolve(
        __dirname,
        `../../../test/workspaces/empty-single/node_modules/@bufbuild/buf-${os.platform()}-${os.arch()}/bin/buf.exe`
      );
    }
    // Update the configuration to use a path for the buf binary. This will trigger a new
    // install process for the buf binary, which then starts the language server after.
    await config.update("commandLine.path", configPath);
    await languageServerRunning;

    // Assert the binary path is the configured path
    const bufBinaryPath = bufState.getBufBinaryPath();
    assert.ok(bufBinaryPath);
    assert.ok(bufBinaryPath.endsWith(configPath), bufBinaryPath);
  });

  test("configure commandLine.update", async () => {
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );
    const configuredVersion = "v1.54.0";
    await config.update("commandLine.version", configuredVersion);
    await languageServerRunning;

    // Assert the binary path used is the "downloaded" binary in global storage
    const bufBinaryPath = bufState.getBufBinaryPath();
    assert.ok(bufBinaryPath);
    assert.ok(
      path.matchesGlob(
        bufBinaryPath,
        `**/.vscode-test/user-data/User/globalStorage/bufbuild.vscode-buf/v1.54.0/buf*`
      ),
      bufBinaryPath
    );
  });
});

/**
 * A helper function for stopping the language server and ensuring the status is stable using
 * a listener.
 */
async function stopLanguageServerForTest() {
  const languageServerStopped = setupLanguageServerListener(
    "LANGUAGE_SERVER_STOPPED"
  );
  await stopLanguageServer.execute();
  await languageServerStopped;
}

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
    if (
      languageServerStatus === "LANGUAGE_SERVER_NOT_INSTALLED" ||
      languageServerStatus === "LANGUAGE_SERVER_ERRORED"
    ) {
      reject(
        new Error(`language server in failed state: ${languageServerStatus}`)
      );
      dispose();
    }
  });
  return promise;
}
