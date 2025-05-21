/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as lsp from "vscode-languageclient/node";
import * as cmds from "../../../src/commands";
import * as config from "../../../src/config";
import * as util from "../../../src/util";

import { CommandCallback } from "../../../src/commands/command";
import { BufContext, ServerStatus } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { createStubLog, StubLog } from "../../stubs/stub-log";
import { createStubVscode, StubVscode } from "../../stubs/stub-vscode";

suite("commands.restartBuf", () => {
  vscode.window.showInformationMessage("Start all restartBuf tests.");

  let sandbox: sinon.SinonSandbox;
  let execFileStub: sinon.SinonStub;

  let stubVscode: StubVscode;
  let logStub: StubLog;
  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;
  let callback: CommandCallback;

  setup(() => {
    sandbox = sinon.createSandbox();

    execFileStub = sandbox.stub(util, "execFile");

    stubVscode = createStubVscode(sandbox);
    logStub = createStubLog(sandbox);
    ctx = MockExtensionContext.new();
    bufCtx = new BufContext();

    callback = cmds.restartBuf.factory(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("if server is running, stops the server", async () => {
    bufCtx.client = {} as unknown as lsp.LanguageClient;
    const stopBufExec = sandbox.stub(cmds.stopBuf, "execute");

    await callback();

    assert.strictEqual(
      stopBufExec.calledOnce,
      true,
      "stop() should be called once"
    );
  });

  test("if buf not enabled, logs warning and does nothing", async () => {
    const configStub = sandbox.stub(config, "get").returns(false);

    await callback();

    assert.strictEqual(
      bufCtx.status,
      ServerStatus.SERVER_DISABLED,
      "status should be SERVER_DISABLED"
    );
    assert.strictEqual(logStub.warn.called, true, "warn should be logged");
  });

  test("if buf is enabled but not installed, logs error and does nothing", async () => {
    const configStub = sandbox.stub(config, "get").returns(true);

    await callback();

    assert.strictEqual(
      bufCtx.status,
      ServerStatus.SERVER_NOT_INSTALLED,
      "status should be SERVER_NOT_INSTALLED"
    );
    assert.strictEqual(logStub.error.called, true, "error should be logged");
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

    const configStub = sandbox.stub(config, "get").callsFake((key: string) => {
      if (key === "enable") {
        return true;
      }
      if (key === "arguments") {
        return [];
      }

      return undefined;
    });

    await callback();

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
      logStub.info.calledWith("Buf Language Server started."),
      true,
      "info should be logged"
    );
  });
});
