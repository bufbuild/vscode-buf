/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as fs from "fs";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as util from "../../../src/util";
import * as version from "../../../src/version";
import * as github from "../../../src/github";

import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { log } from "../../../src/log";

suite("commands.installBuf", () => {
  vscode.window.showInformationMessage("Start all installBuf tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;
  let logInfoStub: sinon.SinonStub;

  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;

  let serverOutputChannelStub: sinon.SinonStub;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cmdCallback: (...args: any[]) => any;

  setup(() => {
    sandbox = sinon.createSandbox();

    execFileStub = sandbox.stub(util, "execFile");
    logErrorStub = sandbox.stub(log, "error");
    logInfoStub = sandbox.stub(log, "info");

    serverOutputChannelStub = sandbox
      .stub(vscode.window, "createOutputChannel")
      .returns({
        name: "Buf (server)",
        dispose: () => {},
        logLevel: vscode.LogLevel.Info,
        onDidChangeLogLevel: { event: () => () => {} },
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      } as unknown as vscode.LogOutputChannel);

    ctx = MockExtensionContext.new();
    bufCtx = new BufContext();

    sandbox
      .stub(vscode.commands, "registerCommand")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .callsFake((_: string, callback: (...args: any[]) => any) => {
        cmdCallback = callback;
        return {
          dispose: () => {},
        } as unknown as vscode.Disposable;
      });

    cmds.installBuf.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("shows error message and does nothing if 'buf.commandLine.path' is set in config", async () => {
    const bufPath = "/usr/local/bin/buf";

    const getConfigurationStub = sandbox
      .stub(vscode.workspace, "getConfiguration")
      .returns({
        get: function (key: string) {
          if (key === "commandLine.path") {
            return bufPath;
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

    const showErrorMessageStub = sandbox.stub(
      vscode.window,
      "showErrorMessage"
    );

    await cmdCallback();

    assert.strictEqual(
      showErrorMessageStub.calledOnce,
      true,
      "Error message shown once"
    );
    assert.strictEqual(
      getConfigurationStub.calledOnce,
      true,
      "Configuration accessed once"
    );
  });

  test("updates buf if its already installed", async () => {
    const bufPath = "/usr/local/bin/buf";
    bufCtx.buf = new BufVersion(bufPath, new semver.Range("1.34.15"));

    const execCmdStub = sandbox
      .stub(vscode.commands, "executeCommand")
      .resolves();

    await cmdCallback();
    assert.strictEqual(
      execCmdStub.calledOnceWith(cmds.updateBuf.command),
      true
    );
  });

  test("installs the latest release from github", async () => {
    const bufPath = "/usr/local/bin/buf";
    sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.34.15")));

    const dummyRelease = {
      name: "v1.0.0",
      tag_name: "v1.0.0",
      assets: [],
    };

    const dummyAsset = {
      name: "buf-Darwin-arm64",
      browser_download_url: "http://dummy",
    };

    sandbox.stub(github, "getRelease").resolves(dummyRelease);
    sandbox.stub(github, "findAsset").resolves(dummyAsset);

    const storagePath = "/path/to/storage";
    sandbox.stub(ctx, "globalStorageUri").value({
      fsPath: storagePath,
    });

    sandbox.stub(fs.promises, "mkdir").resolves();
    sandbox.stub(fs.promises, "access").throws("File not found");
    const downloadStub = sandbox.stub(util, "download").resolves();
    sandbox.stub(fs.promises, "chmod").resolves();

    const restartBufStub = sandbox.stub(cmds.restartBuf, "execute").resolves();

    await cmdCallback();

    assert.strictEqual(downloadStub.calledOnce, true);
    assert.strictEqual(bufCtx.buf?.path, bufPath);
    assert.strictEqual(restartBufStub.calledOnce, true);
  });
});
