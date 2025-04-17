/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as fs from "fs";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as config from "../../../src/config";
import * as github from "../../../src/github";
import * as util from "../../../src/util";
import * as version from "../../../src/version";

import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { createStubLog, StubLog } from "../../stubs/stub-log";
import { createStubVscode, StubVscode } from "../../stubs/stub-vscode";

suite("commands.installBuf", () => {
  vscode.window.showInformationMessage("Start all installBuf tests.");

  let sandbox: sinon.SinonSandbox;

  let stubVscode: StubVscode;
  let logStub: StubLog;
  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;
  let callback: cmds.CommandCallback;

  setup(() => {
    sandbox = sinon.createSandbox();

    stubVscode = createStubVscode(sandbox);
    logStub = createStubLog(sandbox);
    ctx = MockExtensionContext.new();
    bufCtx = new BufContext();

    callback = cmds.installBuf.factory(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("shows error message and does nothing if 'buf.commandLine.path' is set in config", async () => {
    const bufPath = "/usr/local/bin/buf";

    const configStub = sandbox.stub(config, "get").returns(bufPath);

    await callback();

    assert.strictEqual(
      stubVscode.window.showErrorMessage.calledOnce,
      true,
      "Error message shown once"
    );
    assert.strictEqual(
      configStub.calledOnce,
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

    await callback();
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

    await callback();

    assert.strictEqual(downloadStub.calledOnce, true);
    assert.strictEqual(bufCtx.buf?.path, bufPath);
    assert.strictEqual(restartBufStub.calledOnce, true);
  });
});
