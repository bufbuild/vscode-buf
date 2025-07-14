import assert from "assert";
import { bufState } from "../../src/state";

suite("extension state", () => {
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
      } catch (_e) {
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
      } catch (_e) {
        // no actions, pass continues to be false
      }
    });
    bufState.handleExtensionStatus(busy);
    assert.strictEqual(eventFired, true);
    assert.strictEqual(pass, true);
  });
});
