/* eslint-disable @typescript-eslint/no-unused-vars */

import * as assert from "assert";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as util from "../../../src/util";

import { bufGenerate } from "../../../src/commands/index";
import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { createStubLog, StubLog } from "../../stubs/stub-log";
import { createStubVscode, StubVscode } from "../../stubs/stub-vscode";
import { CommandCallback } from "../../../src/commands/command";

suite("commands.bufGenerate", () => {
  vscode.window.showInformationMessage("Start all bufGenerate tests.");

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

    callback = bufGenerate.factory(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("should log an error if buf is not installed", async () => {
    bufCtx.buf = undefined;

    await callback();

    assert.strictEqual(logStub.error.calledOnce, true);
  });

  test("should call 'buf generate'", async () => {
    bufCtx.buf = new BufVersion("/path/to/buf", new semver.Range("1.0.0"));
    execFileStub.resolves({ stdout: "Generated successfully", stderr: "" });

    await callback();

    assert.strictEqual(execFileStub.calledOnce, true);
    assert.deepStrictEqual(execFileStub.args[0], [
      "/path/to/buf",
      ["generate"],
      { cwd: vscode.workspace.rootPath },
    ]);
    assert.strictEqual(logStub.info.calledWith("Generated successfully"), true);
  });

  test("should throw an error if anything is written to stderr", async () => {
    bufCtx.buf = new BufVersion("/path/to/buf", new semver.Range("1.0.0"));
    execFileStub.resolves({ stdout: "", stderr: "Error occurred" });

    await callback();

    assert.strictEqual(logStub.error.calledOnce, true);
    assert.strictEqual(
      logStub.error.calledWith("Error generating buf: Error occurred"),
      true
    );
  });

  test("should throw an error if executing buf throws an error", async () => {
    bufCtx.buf = new BufVersion("/path/to/buf", new semver.Range("1.0.0"));
    execFileStub.rejects(new Error("Execution failed"));

    await callback();

    assert.strictEqual(logStub.error.calledOnce, true);
    assert.strictEqual(
      logStub.error.calledWith("Error generating buf: Execution failed"),
      true
    );
  });
});
