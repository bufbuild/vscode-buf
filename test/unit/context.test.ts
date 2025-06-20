import * as vscode from "vscode";
import * as sinon from "sinon";

import { BufContext, ServerStatus } from "../../src/context";
import assert from "assert";
import { effect } from "@preact/signals-core";

suite("context", () => {
  vscode.window.showInformationMessage("Start all context tests.");

  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("BufContext", () => {
    test("status is SERVER_STOPPED by default", () => {
      const context = new BufContext();
      assert.strictEqual(
        context.status,
        ServerStatus.SERVER_STOPPED,
        "The default status should be SERVER_STOPPED."
      );
    });

    test("changing status emits event", (done) => {
      const context = new BufContext();
      let eventFired = false;
      let allowEffects = false;
      effect(() => {
        void context.status;
        if (allowEffects) {
          eventFired = true;
          // Ensure that the updated status is set correctly.
          assert.strictEqual(
            context.status,
            ServerStatus.SERVER_RUNNING,
            "The status should change to SERVER_RUNNING."
          );
          done();
        }
      });
      allowEffects = true;
      // Change status
      context.status = ServerStatus.SERVER_RUNNING;
      // In case the event isn't fired:
      setTimeout(() => {
        if (!eventFired) {
          done(new Error("Event was not fired for status change."));
        }
      }, 2000);
    });

    test("changing busy also emits event", (done) => {
      const context = new BufContext();
      let eventFired = false;
      let allowEffects = false;
      effect(() => {
        void context.busy;
        if (allowEffects) {
          eventFired = true;
          // Assert busy changed to true
          assert.strictEqual(
            context.busy,
            true,
            "Busy should be true after setting."
          );
          done(); 
        }
      });
      allowEffects = true;
      // Change busy property
      context.busy = true;
      // In case the event isn't fired:
      setTimeout(() => {
        if (!eventFired) {
          done(new Error("Event was not fired for busy change."));
        }
      }, 2000);
    });
  });
});
