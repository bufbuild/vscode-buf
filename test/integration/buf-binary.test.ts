import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import assert from "assert";
import { promisify } from "util";
import { githubReleaseURL, Release } from "../../src/github";
import * as config from "../../src/config";
import { bufState } from "../../src/state";
import { installBuf } from "../../src/commands/install-buf";
import { startLanguageServer } from "../../src/commands/start-lsp";
import { stopLanguageServer } from "../../src/commands/stop-lsp";

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
    await config.update("commandLine.path", undefined);
    await config.update("commandLine.version", undefined);
  });

  test("no configs, use system buf on $PATH", async () => {
    await installBuf.execute();
    // Due to the async nature of the command, we expect the status to either be LANGUAGE_SERVER_STARTING
    // or LANGUAGE_SERVER_RUNNING.
    assert.ok(
      ["LANGUAGE_SERVER_RUNNING", "LANGUAGE_SERVER_STARTING"].includes(
        bufState.getLanguageServerStatus()
      ),
      bufState.getLanguageServerStatus()
    );
    const { stdout, stderr } = await exec("buf --version");
    assert.strictEqual(stderr, "");
    const bufBinaryVersion = bufState.getBufBinaryVersion();
    assert.ok(bufBinaryVersion);
    assert.strictEqual(bufBinaryVersion.compare(stdout), 0);
  });

  test("configure commandLine.path", async () => {
    let configPath = "node_modules/.bin/buf";
    if (os.platform() === "win32") {
      configPath = path.resolve(
        __dirname,
        `../../../test/workspaces/empty-single/node_modules/@bufbuild/buf-${os.platform()}-${os.arch()}/bin/buf.exe`
      );
    }
    await config.update("commandLine.path", configPath);
    await installBuf.execute();
    // Due to the async nature of the command, we expect the status to either be LANGUAGE_SERVER_STARTING
    // or LANGUAGE_SERVER_RUNNING.
    assert.ok(
      ["LANGUAGE_SERVER_RUNNING", "LANGUAGE_SERVER_STARTING"].includes(
        bufState.getLanguageServerStatus()
      ),
      `${bufState.getLanguageServerStatus()} ${bufState.getBufBinaryPath()}`
    );
    const bufBinaryPath = bufState.getBufBinaryPath();
    assert.ok(bufBinaryPath);
    assert.ok(bufBinaryPath.endsWith(configPath), bufBinaryPath);
  });

  test("configure commandLine.update", async () => {
    await config.update("commandLine.path", undefined);
    const configuredVersion = "v1.54.0";
    await config.update("commandLine.version", configuredVersion);
    await installBuf.execute();
    // Due to the async nature of the command, we expect the status to either be LANGUAGE_SERVER_STARTING
    // or LANGUAGE_SERVER_RUNNING.
    assert.ok(
      ["LANGUAGE_SERVER_RUNNING", "LANGUAGE_SERVER_STARTING"].includes(
        bufState.getLanguageServerStatus()
      ),
      bufState.getLanguageServerStatus()
    );
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

  test("starting and stopping the lsp", async () => {
    await stopLanguageServer.execute();
    assert.strictEqual(
      bufState.getLanguageServerStatus(),
      "LANGUAGE_SERVER_STOPPED"
    );
    await startLanguageServer.execute();
    // Due to the async nature of the command, we expect the status to either be LANGUAGE_SERVER_STARTING
    // or LANGUAGE_SERVER_RUNNING.
    assert.ok(
      ["LANGUAGE_SERVER_RUNNING", "LANGUAGE_SERVER_STARTING"].includes(
        bufState.getLanguageServerStatus()
      ),
      bufState.getLanguageServerStatus()
    );
  });
});
