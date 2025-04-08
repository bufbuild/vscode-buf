/* eslint-disable @typescript-eslint/naming-convention */

import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";

import proxyquire from "proxyquire";

suite("github", () => {
  vscode.window.showInformationMessage("Start all github tests.");

  let sandbox: sinon.SinonSandbox;

  let github: any;
  let osPlatformStub: sinon.SinonStub;
  let osArchStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();

    osPlatformStub = sandbox.stub();
    osArchStub = sandbox.stub();

    github = proxyquire("../../src/github", {
      os: {
        platform: osPlatformStub,
        arch: osArchStub,
      },
    });
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("latestRelease", () => {
    test("finds the latest release", async () => {
      const dummyRelease = {
        name: "v1.0.0",
        tag_name: "v1.0.0",
        assets: [],
      };

      // Stub the global fetch to simulate a successful response.
      const dummyResponse = {
        ok: true,
        json: async () => dummyRelease,
        url: "http://dummy",
        status: 200,
        statusText: "OK",
      };
      const fetchStub = sandbox
        .stub(global, "fetch")
        .resolves(dummyResponse as Response);

      const release = await github.latestRelease();
      assert.deepStrictEqual(release, dummyRelease);

      assert.strictEqual(fetchStub.calledOnce, true);
      fetchStub.restore();
    });
  });

  suite("findAsset", () => {
    test("finds the asset in a release", async () => {
      const tt = [
        {
          platform: "darwin",
          arch: "arm64",
          expected: "buf-Darwin-arm64",
        },
        {
          platform: "linux",
          arch: "aarch64",
          expected: "buf-Linux-aarch64",
        },
        {
          platform: "linux",
          arch: "arm64",
          expected: "buf-Linux-aarch64",
        },
        {
          platform: "win32",
          arch: "x64",
          expected: "buf-Windows-x86_64.exe",
        },
        {
          platform: "win32",
          arch: "x86",
          expected: "buf-Windows-x86_64.exe",
        },
      ];

      const dummyRelease = {
        name: "v2.0.0",
        tag_name: "v2.0.0",
        assets: [
          {
            name: "buf-Darwin-arm64",
            browser_download_url: "http://dummy.com/buf",
          },
          {
            name: "buf-Linux-x86_64",
            browser_download_url: "http://dummy.com/buf",
          },
          {
            name: "buf-Linux-aarch64",
            browser_download_url: "http://dummy.com/buf",
          },
          {
            name: "buf-Windows-x86_64.exe",
            browser_download_url: "http://dummy.com/buf",
          },
        ],
      };

      for (const t of tt) {
        osPlatformStub.returns(t.platform);
        osArchStub.returns(t.arch);

        const asset = await github.findAsset(dummyRelease);
        assert.strictEqual(asset.name, t.expected);
      }
    });
  });
});
