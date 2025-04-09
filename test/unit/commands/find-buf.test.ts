/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as fs from "fs";
import path from "path";
import proxyquire from "proxyquire";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as version from "../../../src/version";

import { bufFilename } from "../../../src/const";
import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import type * as findBufType from "../../../src/commands/find-buf";

suite("commands.findBuf", () => {
  vscode.window.showInformationMessage("Start all findBuf tests.");

  let sandbox: sinon.SinonSandbox;

  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;

  let serverOutputChannelStub: sinon.SinonStub;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cmdCallback: (...args: any[]) => any;

  let findBufMod: typeof findBufType;
  let whichStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();

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

    whichStub = sandbox.stub();

    findBufMod = proxyquire("../../../src/commands/find-buf", {
      which: whichStub,
    });

    findBufMod.findBuf.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("when buf.path set in config, uses buf from config", async () => {
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

    const versionFromPathStub = sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await cmdCallback();

    assert.strictEqual(bufCtx.buf?.path, bufPath, "Paths should match");
    assert.strictEqual(
      versionFromPathStub.calledOnce,
      true,
      "fromPath should be called once"
    );
    assert.strictEqual(
      getConfigurationStub.calledOnce,
      true,
      "getConfiguration should be called once"
    );
  });

  test("when buf.commandLine.version set, finds specific buf version in the extension storage", async () => {
    const storagePath = "/path/to/storage";
    const bufPath = path.join(storagePath, "v1", bufFilename);

    sandbox.stub(ctx, "globalStorageUri").value({
      fsPath: storagePath,
    });
    sandbox
      .stub(fs.promises, "readdir")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .resolves(["v2" as any, "v1" as any, "v3" as any]);

    const getConfigurationStub = sandbox
      .stub(vscode.workspace, "getConfiguration")
      .returns({
        get: function (key: string) {
          if (key === "commandLine.version") {
            return "v1";
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

    sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await cmdCallback();

    assert.strictEqual(bufCtx.buf?.path, bufPath, "buf path should match");
  });

  test("when buf installed by extension, finds buf in the extension storage", async () => {
    const storagePath = "/path/to/storage";
    const bufPath = path.join(storagePath, "v1", bufFilename);

    sandbox.stub(ctx, "globalStorageUri").value({
      fsPath: storagePath,
    });
    sandbox
      .stub(fs.promises, "readdir")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .resolves(["v2" as any, "v1" as any, "v3" as any]);

    sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await cmdCallback();

    assert.strictEqual(bufCtx.buf?.path, bufPath, "buf path should match");
  });

  test("when no buf installed in extension, finds buf in the os path", async () => {
    const bufPath = "/usr/local/bin/buf";
    whichStub.returns(bufPath);

    const storagePath = "/path/to/storage";
    sandbox.stub(ctx, "globalStorageUri").value({
      fsPath: storagePath,
    });

    sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await cmdCallback();

    assert.strictEqual(bufCtx.buf !== null, true, "bufCtx.buf should be set");
    assert.strictEqual(bufCtx.buf?.path, bufPath, "buf path should match");
  });
});
