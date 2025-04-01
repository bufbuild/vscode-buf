/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode from "vscode";
import * as sinon from "sinon";

import { BufContext, ServerStatus } from "../../src/context";
import assert from "assert";

suite("context", () => {
  vscode.window.showInformationMessage("Start all context tests.");

  let sandbox: sinon.SinonSandbox;
  let serverOutputChannelStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();

    serverOutputChannelStub = sandbox.stub(vscode.window, "createOutputChannel").returns({
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
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("BufContext", () => {
    test("constructs a new output channel", () => {
      const context = new BufContext();
      assert.strictEqual(serverOutputChannelStub.calledOnceWith("Buf (server)"), true);
      // Optionally verify the name if needed:
      assert.strictEqual(
        context.serverOutputChannel.name,
        "Buf (server)",
        "The output channel name should be 'Buf (server)'."
      );
    });

    test("status is SERVER_STOPPED by default", () => {
      const context = new BufContext();
      assert.strictEqual(context.status, ServerStatus.SERVER_STOPPED, "The default status should be SERVER_STOPPED.");
    });

    test("changing status emits event", (done) => {
      const context = new BufContext();
      let eventFired = false;
      const subscription = context.onDidChangeContext(() => {
        eventFired = true;
        subscription.dispose();
        // Ensure that the updated status is set correctly.
        assert.strictEqual(context.status, ServerStatus.SERVER_RUNNING, "The status should change to SERVER_RUNNING.");
        context.dispose();
        done();
      });
      // Change status
      context.status = ServerStatus.SERVER_RUNNING;
      // In case the event isn't fired:
      setTimeout(() => {
        if (!eventFired) {
          subscription.dispose();
          context.dispose();
          done(new Error("Event was not fired for status change."));
        }
      }, 2000);
    });

    test("changing busy also emits event", (done) => {
      const context = new BufContext();
      let eventFired = false;
      const subscription = context.onDidChangeContext(() => {
        eventFired = true;
        subscription.dispose();
        // Assert busy changed to true
        assert.strictEqual(context.busy, true, "Busy should be true after setting.");
        context.dispose();
        done();
      });
      // Change busy property
      context.busy = true;
      // In case the event isn't fired:
      setTimeout(() => {
        if (!eventFired) {
          subscription.dispose();
          context.dispose();
          done(new Error("Event was not fired for busy change."));
        }
      }, 2000);
    });
  });
});
