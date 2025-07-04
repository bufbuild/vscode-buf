import * as vscode from "vscode";
import assert from "assert";
import { glob } from "glob";
import { bufState } from "../../src/state";

suite("extension state", () => {
  test("extension activation state", async () => {
    // Activation events are configured in package.json.
    let expectActivated = false;
    const allGlobs = await Promise.all(
      vscode.workspace.workspaceFolders?.map((workspaceFolder) => {
        return glob(
          [
            "**/*.proto",
            "**/buf.yaml",
            "**/buf.lock",
            "**/buf.mod",
            "**/buf.work",
            "**/buf.gen.yaml",
            "**/buf.work.yaml",
          ],
          { cwd: workspaceFolder.uri.path }
        );
      }) ?? []
    );
    if (allGlobs.flatMap((i) => i).length) {
      expectActivated = true;
    }
    assert.strictEqual(
      bufState.languageServerStatus,
      expectActivated ? "LANGUAGE_SERVER_RUNNING" : "LANGUAGE_SERVER_STOPPED"
    );
    assert.strictEqual(!!bufState.client, expectActivated);
    assert.strictEqual(!!bufState.buf, expectActivated);
    assert.strictEqual(bufState.getExtensionStatus(), "EXTENSION_IDLE");
  });

  test("changing language server status emits event", () => {
    let eventFired = false;
    let pass = false;
    const languageServerStatus = "LANGUAGE_SERVER_STARTING";
    const subscription = bufState.onDidChangeState(() => {
      eventFired = true;
      subscription.dispose();
      try {
        assert.strictEqual(bufState.languageServerStatus, languageServerStatus);
        pass = true;
      } catch (e) {
        // no actions, pass continues to be false
      }
    });
    bufState.languageServerStatus = languageServerStatus;
    assert.strictEqual(eventFired, true);
    assert.strictEqual(pass, true);
  });

  test("changing extension status emits event", () => {
    let eventFired = false;
    let pass = false;
    const busy = "EXTENSION_PROCESSING";
    const subscription = bufState.onDidChangeState(() => {
      eventFired = true;
      subscription.dispose();
      try {
        assert.strictEqual(bufState.getExtensionStatus(), busy);
        pass = true;
      } catch (e) {
        // no actions, pass continues to be false
      }
    });
    bufState.handleExtensionStatus(busy);
    assert.strictEqual(eventFired, true);
    assert.strictEqual(pass, true);
  });
});
