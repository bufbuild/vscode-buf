import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import assert from "assert";
import { promisify } from "util";
import { githubReleaseURL, Release } from "../../src/github";
import * as config from "../../src/config";
import { installBuf } from "../../src/commands/install-buf";
import { startBuf } from "../../src/commands/start-buf";
import { stopBuf } from "../../src/commands/stop-buf";
import { bufState } from "../../src/state";
import { execFile } from "../../src/util";

/**
 * The test asset download URL. We use a single test download URL for all assets so that
 * tests are consistent across platforms.
 */
const assetDownloadURL =
  "https://api.github.com/repos/bufbuild/buf/releases/assets/";
const downloadBinPath =
  "test/workspaces/version-single/node_modules/@bufbuild/";

/**
 * msw stub handlers for GitHub releases API.
 */
const handlers = [
  http.get(githubReleaseURL, () => {
    return HttpResponse.json([
      // Make a list of releases here
      // Make response for their asset url
    ]);
  }),
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
      ],
    } satisfies Release);
  }),
  http.get(`${assetDownloadURL}:platformKey`, ({ params }) => {
    try {
      const bin = fs.readFileSync(
        os.platform() === "win32"
          ? `${downloadBinPath}${params.platformKey}/bin/buf.exe`
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
  const isVersionSingleWorkspace = vscode.workspace.workspaceFolders?.some(
    (item) => item.name === "version-single"
  );
  suiteSetup(async () => {
    server.listen();
  });

  suiteTeardown(async () => {
    server.close();
  });

  teardown(async () => {
    server.resetHandlers();
    if (isVersionSingleWorkspace) {
      await config.update("commandLine.version", undefined);
    }
  });

  test("no configs, use system buf on $PATH", async () => {
    if (config.get("commandLine.path") || config.get("commandLine.version")) {
      // Only run this test if neither commandLine.path or commandLine.version are set
      return;
    }
    if (isVersionSingleWorkspace) {
      // Do not run this test for version-single workspace, instead, we will install by
      // configuring a version in settings.
      return;
    }
    assert.strictEqual(config.get("commandLine.path"), "");
    assert.strictEqual(config.get("commandLine.version"), "");

    await installBuf.execute();
    assert.strictEqual(
      bufState.languageServerStatus,
      "LANGUAGE_SERVER_RUNNING"
    );
    const { stdout, stderr } = await exec("buf --version");
    assert.strictEqual(stderr, "");
    assert.strictEqual(bufState.buf?.version.compare(stdout), 0);
    bufState.buf = undefined;
  });

  test("use path", async () => {
    if (os.platform() === "win32") {
      // TODO: skip this test for Windows since the "commandLine.path" does not currently
      // provide the .exe file extension.
      return;
    }
    const configuredPath = config.get<string>("commandLine.path");
    if (!configuredPath) {
      // Only run this test if commandLine.path is set
      return;
    }
    await installBuf.execute();
    const { stdout, stderr } = await execFile(configuredPath, ["--version"]);
    assert.ok(!stderr);
    assert.strictEqual(
      bufState.languageServerStatus,
      "LANGUAGE_SERVER_RUNNING"
    );
    assert.strictEqual(bufState.buf?.version.compare(stdout.trim()), 0);
  });

  test("use version config", async () => {
    if (!isVersionSingleWorkspace) {
      // Only run this test for the vesrion-single workspace.
      return;
    }
    const configuredVersion = "v1.53.0";
    await config.update("commandLine.version", configuredVersion);
    await installBuf.execute();
    assert.strictEqual(
      bufState.languageServerStatus,
      "LANGUAGE_SERVER_RUNNING"
    );
    assert.strictEqual(
      bufState.buf?.version.compare(configuredVersion),
      0,
      `${bufState.buf?.version} ${configuredVersion}`
    );
  });

  test("stop server", async () => {
    if (os.platform() === "win32" && config.get("commandLine.path")) {
      // TODO: since we are skipping the installation test when path is set for windows,
      // we also need to skip stopping the server here.
      return;
    }
    await stopBuf.execute();
    assert.strictEqual(
      bufState.languageServerStatus,
      "LANGUAGE_SERVER_STOPPED"
    );
  });

  test("start server", async () => {
    if (os.platform() === "win32" && config.get("commandLine.path")) {
      // TODO: since we are skipping the installation test when path is set for windows,
      // we also need to skip starting the server here.
      return;
    }
    await startBuf.execute();
    assert.strictEqual(
      bufState.languageServerStatus,
      "LANGUAGE_SERVER_RUNNING"
    );
  });
});
