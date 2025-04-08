/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as util from "../../../src/util";
import * as github from "../../../src/github";
import * as installBuf from "../../../src/commands/install-buf";

import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";

suite("commands.updateBuf", () => {
  vscode.window.showInformationMessage("Start all updateBuf tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;
  let logInfoStub: sinon.SinonStub;

  let ctx: any;
  let bufCtx: BufContext;

  let serverOutputChannelStub: sinon.SinonStub;

  let cmdCallback: (...args: any[]) => any;

  setup(() => {
    sandbox = sinon.createSandbox();

    execFileStub = sandbox.stub(util, "execFile");
    logErrorStub = sandbox.stub(util.log, "error");
    logInfoStub = sandbox.stub(util.log, "info");

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
      .callsFake((_: string, callback: (...args: any[]) => any) => {
        cmdCallback = callback;
        return {
          dispose: () => {},
        } as unknown as vscode.Disposable;
      });

    cmds.updateBuf.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("if buf isn't installed, log error and do nothing", async () => {
    bufCtx.buf = undefined;

    await cmdCallback();

    assert.strictEqual(logErrorStub.calledOnce, true);
  });

  test("if current version installed, does nothing", async () => {
    const bufPath = "/usr/local/bin/buf";
    bufCtx.buf = new BufVersion(bufPath, new semver.Range("1.34.15"));

    const dummyRelease = {
      name: "v1.34.15",
      tag_name: "v1.34.15",
      assets: [],
    };

    const dummyAsset = {
      name: "buf-Darwin-arm64",
      browser_download_url: "http://dummy",
    };

    sandbox.stub(github, "latestRelease").resolves(dummyRelease);
    sandbox.stub(github, "findAsset").resolves(dummyAsset);

    const showInfoMessageStub = sandbox.spy(
      vscode.window,
      "showInformationMessage"
    );

    const installBufSpy = sandbox.spy(installBuf, "install");

    await cmdCallback();

    assert.strictEqual(showInfoMessageStub.calledOnce, true);
    assert.strictEqual(installBufSpy.notCalled, true);
  });

  test("if new version available, and we want to update, updates", async () => {
    const bufPath = "/usr/local/bin/buf";
    bufCtx.buf = new BufVersion(bufPath, new semver.Range("1.34.14"));

    const dummyRelease = {
      name: "v1.34.15",
      tag_name: "v1.34.15",
      assets: [],
    };

    const dummyAsset = {
      name: "buf-Darwin-arm64",
      browser_download_url: "http://dummy",
    };

    sandbox.stub(github, "latestRelease").resolves(dummyRelease);
    sandbox.stub(github, "findAsset").resolves(dummyAsset);

    const showInfoMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install cli v1.34.15" as any);
    const installBufStub = sandbox
      .stub(installBuf, "install")
      .resolves(bufPath);

    sandbox
      .stub(BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.34.14")));
    const restartBufStub = sandbox.stub(cmds.restartBuf, "execute").resolves();

    await cmdCallback();

    assert.strictEqual(showInfoMessageStub.callCount, 2);
    assert.strictEqual(installBufStub.calledOnce, true);
    assert.strictEqual(
      installBufStub.calledWith(ctx, dummyRelease, dummyAsset),
      true
    );
    assert.strictEqual(restartBufStub.calledOnce, true);
  });
});
