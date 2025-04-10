/* eslint-disable @typescript-eslint/no-unused-vars */

import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as installBuf from "../../../src/commands/install-buf";
import * as github from "../../../src/github";
import * as util from "../../../src/util";

import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { createStubVscode, StubVscode } from "../../stubs/stub-vscode";
import { createStubLog, StubLog } from "../../stubs/stub-log";

suite("commands.updateBuf", () => {
  vscode.window.showInformationMessage("Start all updateBuf tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;

  let stubVscode: StubVscode;
  let logStub: StubLog;
  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;
  let callback: cmds.CommandCallback;

  setup(() => {
    sandbox = sinon.createSandbox();

    execFileStub = sandbox.stub(util, "execFile");

    stubVscode = createStubVscode(sandbox);
    logStub = createStubLog(sandbox);
    ctx = MockExtensionContext.new();
    bufCtx = new BufContext();

    callback = cmds.updateBuf.factory(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("if buf isn't installed, log error and do nothing", async () => {
    bufCtx.buf = undefined;

    await callback();

    assert.strictEqual(logStub.error.calledOnce, true);
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

    sandbox.stub(github, "getRelease").resolves(dummyRelease);
    sandbox.stub(github, "findAsset").resolves(dummyAsset);

    const installBufSpy = sandbox.spy(installBuf, "install");

    await callback();

    assert.strictEqual(
      stubVscode.window.showInformationMessage.calledOnce,
      true
    );
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

    sandbox.stub(github, "getRelease").resolves(dummyRelease);
    sandbox.stub(github, "findAsset").resolves(dummyAsset);

    const installBufStub = sandbox
      .stub(installBuf, "install")
      .resolves(bufPath);

    sandbox
      .stub(BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.34.14")));
    const restartBufStub = sandbox.stub(cmds.restartBuf, "execute").resolves();

    stubVscode.window.showInformationMessage.resolves("Install cli v1.34.15");

    await callback();

    assert.strictEqual(
      installBufStub.calledOnce,
      true,
      "installBuf called once"
    );
    assert.strictEqual(
      installBufStub.calledWith(ctx, dummyRelease, dummyAsset),
      true,
      "installBuf called with correct arguments"
    );
    assert.strictEqual(
      restartBufStub.calledOnce,
      true,
      "restartBuf called once"
    );
  });
});
