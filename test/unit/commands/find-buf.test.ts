/* eslint-disable @typescript-eslint/no-unused-vars */
import * as assert from "assert";
import * as fs from "fs";
import path from "path";
import proxyquire from "proxyquire";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import type * as findBufType from "../../../src/commands/find-buf";
import * as config from "../../../src/config";
import * as version from "../../../src/version";

import { CommandCallback } from "../../../src/commands";
import { bufFilename } from "../../../src/const";
import { BufContext } from "../../../src/context";
import { BufVersion } from "../../../src/version";
import { MockExtensionContext } from "../../mocks/mock-context";
import { createStubVscode, StubVscode } from "../../stubs/stub-vscode";

suite("commands.findBuf", () => {
  vscode.window.showInformationMessage("Start all findBuf tests.");

  let sandbox: sinon.SinonSandbox;

  let ctx: vscode.ExtensionContext;
  let bufCtx: BufContext;

  let stubVscode: StubVscode;

  let findBufMod: typeof findBufType;
  let whichStub: sinon.SinonStub;

  let callback: CommandCallback;

  setup(() => {
    sandbox = sinon.createSandbox();

    stubVscode = createStubVscode(sandbox);

    ctx = MockExtensionContext.new();
    bufCtx = new BufContext();

    whichStub = sandbox.stub();

    findBufMod = proxyquire("../../../src/commands/find-buf", {
      which: whichStub,
    });

    callback = findBufMod.findBuf.factory(ctx, bufCtx);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("when buf.path set in config, uses buf from config", async () => {
    const bufPath = "/usr/local/bin/buf";

    const configStub = sandbox.stub(config, "get").returns(bufPath);

    const versionFromPathStub = sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await callback();

    assert.strictEqual(bufCtx.buf?.path, bufPath, "Paths should match");
    assert.strictEqual(
      versionFromPathStub.calledOnce,
      true,
      "fromPath should be called once"
    );
    assert.strictEqual(
      configStub.calledOnce,
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

    const configStub = sandbox.stub(config, "get").returns("v1");

    sandbox
      .stub(version.BufVersion, "fromPath")
      .resolves(new BufVersion(bufPath, new semver.Range("1.44.15")));

    await callback();

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

    await callback();

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

    await callback();

    assert.strictEqual(bufCtx.buf !== null, true, "bufCtx.buf should be set");
    assert.strictEqual(bufCtx.buf?.path, bufPath, "buf path should match");
  });
});
