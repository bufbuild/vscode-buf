/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as path from "path";
import * as semver from "semver";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as github from "../../src/github";
import * as util from "../../src/util";

import { BufVersion, getBufVersion } from "../../src/version";
import { MockExtensionContext } from "../mocks/MockContext";

suite("version", () => {
  vscode.window.showInformationMessage("Start all version tests.");

  let sandbox: sinon.SinonSandbox;
  let ctx: any;

  setup(() => {
    sandbox = sinon.createSandbox();
    ctx = MockExtensionContext.new();
  });

  teardown(() => {
    sandbox.restore();
    ctx.teardown();
  });

  suite("BufVersion", () => {
    test("Parses simple version successfully", () => {
      const version = new BufVersion(".", new semver.Range("1.34.15"));
      assert.strictEqual(version.version.raw, "1.34.15");
    });

    test("fromPath creates BufVersion instance", async () => {
      const storagePath = "/path/to/storage";
      ctx.globalStorageUri = {
        fsPath: storagePath,
      } as vscode.Uri;
      const execFileStub = sandbox
        .stub(util, "execFile")
        .resolves({ stdout: "1.34.15\n", stderr: "" });

      const bufVersion = await BufVersion.fromPath("/path/to/buf");

      assert.strictEqual(bufVersion.version.raw, "1.34.15");
    });

    test("when buf from config, fromPath sets source as CONFIG", async () => {
      const bufPath = "/path/to/buf";
      sandbox.stub(vscode.workspace, "getConfiguration").returns({
        get: function (key: string) {
          if (key === "path") {
            return bufPath;
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

      sandbox
        .stub(util, "execFile")
        .resolves({ stdout: "1.34.15\n", stderr: "" });

      const bufVersion = await BufVersion.fromPath(bufPath);
    });

    test("when buf from extension, fromPath sets source as EXTENSION", async () => {
      const storagePath = "/path/to/storage";
      const bufPath = path.join(storagePath, "/path/to/buf");
      sandbox.stub(vscode.workspace, "getConfiguration").returns({
        get: function (key: string) {
          if (key === "path") {
            return undefined;
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

      ctx.globalStorageUri = {
        fsPath: storagePath,
      } as vscode.Uri;

      sandbox
        .stub(util, "execFile")
        .resolves({ stdout: "1.34.15\n", stderr: "" });

      const bufVersion = await BufVersion.fromPath(bufPath);
    });

    test("when buf from path, fromPath sets source as PATH", async () => {
      const storagePath = "/path/to/storage";
      const bufPath = "/path/to/buf";
      sandbox.stub(vscode.workspace, "getConfiguration").returns({
        get: function (key: string) {
          if (key === "path") {
            return undefined;
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

      ctx.globalStorageUri = {
        fsPath: storagePath,
      } as vscode.Uri;

      sandbox
        .stub(util, "execFile")
        .resolves({ stdout: "1.34.15\n", stderr: "" });

      const bufVersion = await BufVersion.fromPath(bufPath);
    });

    test("hasUpgrade detects upgrade", async () => {
      const release = {
        tag_name: "v1.35.0",
        name: "Release 1.35.0",
      } as github.Release;
      const bufVersion = new BufVersion(".", new semver.Range("1.34.15"));

      const result = await bufVersion.hasUpgrade(release);
      assert.strictEqual(result.upgrade, true);
    });

    test("hasUpgrade detects no upgrade", async () => {
      const release = {
        tag_name: "v1.34.15",
        name: "Release 1.34.15",
      } as github.Release;
      const bufVersion = new BufVersion(".", new semver.Range("1.34.15"));

      const result = await bufVersion.hasUpgrade(release);
      assert.strictEqual(result.upgrade, false);
    });
  });

  suite("getBufVersion", () => {
    test("returns correct version", async () => {
      const execFileStub = sandbox
        .stub(util, "execFile")
        .resolves({ stdout: "1.34.15\n", stderr: "" });

      const version = await getBufVersion("/path/to/buf");
      assert.strictEqual(version.raw, "1.34.15");
    });

    test("throws error on stderr", async () => {
      sandbox.stub(util, "execFile").resolves({ stdout: "", stderr: "error" });

      await assert.rejects(async () => {
        await getBufVersion("/path/to/buf");
      }, /Error getting version of '\/path\/to\/buf'! error/);
    });

    test("throws error on empty stdout", async () => {
      sandbox.stub(util, "execFile").resolves({ stdout: "   \n", stderr: "" });

      await assert.rejects(async () => {
        await getBufVersion("/path/to/buf");
      }, /Unable to determine version of '\/path\/to\/buf'!/);
    });
  });
});
