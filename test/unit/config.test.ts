import * as vscode from "vscode";
import * as assert from "assert";
import * as sinon from "sinon";

import { get } from "../../src/config";

suite("config", () => {
  vscode.window.showInformationMessage("Start all config tests.");

  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test("get returns config value", () => {
    const getConfigurationStub = sandbox
      .stub(vscode.workspace, "getConfiguration")
      .returns({
        get: function (key: string) {
          if (key === "buf") {
            return "value";
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

    const result = get("buf");
    assert.strictEqual(result, "value");
    assert.strictEqual(getConfigurationStub.calledOnce, true);
  });

  test("get returns doesn't return config value", () => {
    const getConfigurationStub = sandbox
      .stub(vscode.workspace, "getConfiguration")
      .returns({
        get: function (key: string) {
          if (key === "buf") {
            return {
              key: "value",
            };
          }

          return undefined;
        },
      } as unknown as vscode.WorkspaceConfiguration);

    const result = get("test");
    assert.strictEqual(result, undefined);
    assert.strictEqual(getConfigurationStub.calledOnce, true);
  });
});
