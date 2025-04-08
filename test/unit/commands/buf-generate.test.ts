/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode from "vscode";
import * as assert from "assert";
import * as sinon from "sinon";
import * as util from "../../../src/util";
import { bufGenerate } from "../../../src/commands/buf-generate";
import { BufContext } from "../../../src/context";
import { MockExtensionContext } from "../../mocks/mock-context";

suite("commands.bufGenerate", () => {
  vscode.window.showInformationMessage("Start all bufGenerate tests.");

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

    bufGenerate.register(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
    bufCtx.dispose();
  });

  test("should log an error if buf is not installed", async () => {
    bufCtx.buf = undefined;

    await cmdCallback();

    assert.strictEqual(logErrorStub.calledOnce, true);
  });

  test("should call 'buf generate'", async () => {
    bufCtx.buf = { path: "/path/to/buf", version: "1.0.0" } as any;
    execFileStub.resolves({ stdout: "Generated successfully", stderr: "" });

    await cmdCallback();

    assert.strictEqual(execFileStub.calledOnce, true);
    assert.deepStrictEqual(execFileStub.args[0], [
      "/path/to/buf",
      ["generate"],
      { cwd: vscode.workspace.rootPath },
    ]);
    assert.strictEqual(logInfoStub.calledWith("Generated successfully"), true);
  });

  test("should throw an error if anything is written to stderr", async () => {
    bufCtx.buf = { path: "/path/to/buf", version: "1.0.0" } as any;
    execFileStub.resolves({ stdout: "", stderr: "Error occurred" });

    await cmdCallback();

    assert.strictEqual(logErrorStub.calledOnce, true);
    assert.strictEqual(
      logErrorStub.calledWith("Error generating buf: Error occurred"),
      true
    );
  });

  test("should throw an error if executing buf throws an error", async () => {
    bufCtx.buf = { path: "/path/to/buf", version: "1.0.0" } as any;
    execFileStub.rejects(new Error("Execution failed"));

    await cmdCallback();

    assert.strictEqual(logErrorStub.calledOnce, true);
    assert.strictEqual(
      logErrorStub.calledWith("Error generating buf: Execution failed"),
      true
    );
  });
});
