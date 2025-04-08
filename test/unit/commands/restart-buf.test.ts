/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cmds from "../../../src/commands";
import * as util from "../../../src/util";
import * as lsp from "vscode-languageclient/node";

import { BufContext, ServerStatus } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";

suite("commands.restartBuf", () => {
  vscode.window.showInformationMessage("Start all restartBuf tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;
  let logErrorStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;
  let logInfoStub: sinon.SinonStub;

  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;

  let serverOutputChannelStub: sinon.SinonStub;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cmdCallback: (...args: any[]) => any;

  setup(() => {
    sandbox = sinon.createSandbox();

    execFileStub = sandbox.stub(util, "execFile");
    logErrorStub = sandbox.stub(util.log, "error");
    logWarnStub = sandbox.stub(util.log, "warn");
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

    cmds.restartBuf.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("if server is running, stops the server", async () => {
    const stopStub = sandbox.stub().resolves();
    bufCtx.client = {
      stop: stopStub,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    sandbox.stub(vscode.workspace, "getConfiguration").returns({
      get: function (key: string) {
        if (key === "enable") {
          return false;
        }

        return undefined;
      },
    } as unknown as vscode.WorkspaceConfiguration);

    await cmdCallback();

    assert.strictEqual(
      stopStub.calledOnce,
      true,
      "stop() should be called once"
    );
    assert.strictEqual(
      bufCtx.client,
      undefined,
      "client should be undefined after stopping"
    );
    assert.strictEqual(
      bufCtx.status,
      ServerStatus.SERVER_DISABLED,
      "status should be SERVER_DISABLED"
    );
  });

  test("if buf not enabled, logs warning and does nothing", async () => {
    sandbox.stub(vscode.workspace, "getConfiguration").returns({
      get: function (key: string) {
        if (key === "enable") {
          return false;
        }

        return undefined;
      },
    } as unknown as vscode.WorkspaceConfiguration);

    await cmdCallback();

    assert.strictEqual(bufCtx.client, undefined);
    assert.strictEqual(bufCtx.status, ServerStatus.SERVER_DISABLED);
    assert.strictEqual(logWarnStub.called, true);
  });

  test("if buf is enabled but not installed, logs error and does nothing", async () => {
    sandbox.stub(vscode.workspace, "getConfiguration").returns({
      get: function (key: string) {
        if (key === "enable") {
          return true;
        }

        return undefined;
      },
    } as unknown as vscode.WorkspaceConfiguration);

    await cmdCallback();

    assert.strictEqual(bufCtx.client, undefined, "client should be undefined");
    assert.strictEqual(
      bufCtx.status,
      ServerStatus.SERVER_STOPPED,
      "status should be SERVER_STOPPED"
    );
    assert.strictEqual(logErrorStub.called, true, "error should be logged");
  });

  test("if buf is enabled and installed, starts the server", async () => {
    const bufPath = "/usr/local/bin/buf";
    bufCtx.buf = new BufVersion(bufPath, new semver.Range("1.34.14"));

    const startStub = sandbox.stub().resolves();

    sandbox.stub(lsp, "LanguageClient").returns({
      start: startStub,
      createDefaultErrorHandler: () => ({
        error: () => true,
        closed: () => true,
      }),
      clientOptions: {},
    });

    sandbox.stub(vscode.workspace, "getConfiguration").returns({
      get: function (key: string) {
        if (key === "enable") {
          return true;
        }
        if (key === "arguments") {
          return [];
        }

        return undefined;
      },
    } as unknown as vscode.WorkspaceConfiguration);

    await cmdCallback();

    assert.strictEqual(
      startStub.calledOnce,
      true,
      "start() should be called once"
    );
    assert.strictEqual(
      bufCtx.status,
      ServerStatus.SERVER_RUNNING,
      "status should be SERVER_RUNNING"
    );
    assert.strictEqual(
      logInfoStub.calledWith("Buf Language Server started."),
      true,
      "info should be logged"
    );
  });
});
