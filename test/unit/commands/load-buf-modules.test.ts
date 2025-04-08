/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as util from "../../../src/util";

import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";

suite("commands.loadBufModules", () => {
  vscode.window.showInformationMessage("Start all loadBufModules tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;
  let logInfoStub: sinon.SinonStub;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createFileSystemWatcherSpy: any;

  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;

  let serverOutputChannelStub: sinon.SinonStub;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .callsFake((_: string, callback: (...args: any[]) => any) => {
        cmdCallback = callback;
        return {
          dispose: () => {},
        } as unknown as vscode.Disposable;
      });

    createFileSystemWatcherSpy = sandbox.spy(
      vscode.workspace,
      "createFileSystemWatcher"
    );

    cmds.loadBufModules.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("construction sets up file watchers", async () => {
    assert.strictEqual(createFileSystemWatcherSpy.calledOnce, true);
    assert.strictEqual(
      createFileSystemWatcherSpy.getCall(0).args[0],
      "**/buf.yaml"
    );
  });

  test("logs an error and does nothing if buf is not installed", async () => {
    bufCtx.buf = undefined;

    await cmdCallback();

    assert.strictEqual(logErrorStub.calledOnce, true);
    assert.strictEqual(execFileStub.notCalled, true);
  });

  test("runs 'buf ls-files'", async () => {
    bufCtx.buf = new BufVersion("/path/to/buf", new semver.Range("1.0.0"));

    execFileStub.resolves({
      stdout: `{"path":"external/google/type/latlng.proto","import_path":"google/type/latlng.proto","module":"google","commit":"","is_import":false}`,
      stderr: "",
    });

    await cmdCallback();

    assert.strictEqual(execFileStub.calledOnce, true);
    assert.strictEqual(bufCtx.bufFiles.size, 1);
    assert.strictEqual(
      bufCtx.bufFiles.get("external/google/type/latlng.proto")?.module,
      "google"
    );
  });
});
