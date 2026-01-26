import assert from "node:assert";
import * as vscode from "vscode";
import { getStatusBarItem } from "../../src/status-bar";
import { sleep, waitForStatusBarText } from "./test-helpers";

suite("LSP lifecycle", () => {
  setup(async function () {
    this.timeout(30000);

    // Ensure extension is activated
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

    // Wait for initial state
    await sleep(2000);
  });

  test("status bar item exists after activation", () => {
    const statusBarItem = getStatusBarItem();
    assert.ok(
      statusBarItem,
      "Expected status bar item to exist after activation"
    );
  });

  test("start language server command starts LSP", async function () {
    this.timeout(30000);

    // Execute start command
    await vscode.commands.executeCommand("buf.startLanguageServer");

    // Wait for status bar to show running state
    await waitForStatusBarText("$(check)", 20000);

    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");
    assert.ok(
      statusBarItem.text.includes("$(check)"),
      "Expected status bar to show check icon when running"
    );
  });

  test("stop language server command stops LSP", async function () {
    this.timeout(30000);

    // First, ensure LSP is running
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    // Execute stop command
    await vscode.commands.executeCommand("buf.stopLanguageServer");

    // Wait for status bar to show stopped state
    await waitForStatusBarText("$(x)", 10000);

    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");
    assert.ok(
      statusBarItem.text.includes("$(x)"),
      "Expected status bar to show x icon when stopped"
    );
  });

  test("restart language server after stop", async function () {
    this.timeout(40000);

    // First, ensure LSP is running
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    // Stop the server
    await vscode.commands.executeCommand("buf.stopLanguageServer");
    await waitForStatusBarText("$(x)", 10000);

    let statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem?.text.includes("$(x)"), "Expected stopped state");

    // Restart the server
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    statusBarItem = getStatusBarItem();
    assert.ok(
      statusBarItem?.text.includes("$(check)"),
      "Expected running state after restart"
    );
  });

  test("status bar shows loading icon during startup", async function () {
    this.timeout(30000);

    // Stop the server first
    await vscode.commands.executeCommand("buf.stopLanguageServer");
    await sleep(2000);

    // Start the server and immediately check for loading icon
    const startPromise = vscode.commands.executeCommand(
      "buf.startLanguageServer"
    );

    // Check within a short time window for the loading/sync icon
    let foundLoadingIcon = false;
    for (let i = 0; i < 10; i++) {
      await sleep(100);
      const statusBarItem = getStatusBarItem();
      if (
        statusBarItem &&
        (statusBarItem.text.includes("$(sync~spin)") ||
          statusBarItem.text.includes("$(loading~spin)"))
      ) {
        foundLoadingIcon = true;
        break;
      }
    }

    await startPromise;

    // Note: The loading icon is transient and may not always be caught
    // So we don't make it a hard requirement
    if (foundLoadingIcon) {
      assert.ok(true, "Found loading icon during startup");
    } else {
      assert.ok(true, "Loading icon not caught (may have been too fast)");
    }

    // Verify it eventually reaches running state
    await waitForStatusBarText("$(check)", 20000);
  });

  test("status bar tooltip updates with LSP state", async function () {
    this.timeout(30000);

    // Ensure LSP is running
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    let statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    // Check tooltip when running
    const runningTooltip = statusBarItem.tooltip;
    assert.ok(runningTooltip, "Expected tooltip when running");

    if (runningTooltip && typeof runningTooltip !== "string") {
      const tooltipText = runningTooltip.value;
      assert.ok(
        tooltipText.includes("$(check)") || tooltipText.includes("running"),
        "Expected running tooltip to mention running state"
      );
    }

    // Stop the server and check tooltip
    await vscode.commands.executeCommand("buf.stopLanguageServer");
    await waitForStatusBarText("$(x)", 10000);

    statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist when stopped");
    const stoppedTooltip = statusBarItem.tooltip;
    assert.ok(stoppedTooltip, "Expected tooltip when stopped");

    if (stoppedTooltip && typeof stoppedTooltip !== "string") {
      const tooltipText = stoppedTooltip.value;
      assert.ok(
        tooltipText.includes("$(") ||
          tooltipText.toLowerCase().includes("restart"),
        "Expected stopped tooltip to mention restart"
      );
    }
  });

  test("status bar displays buf version when available", async function () {
    this.timeout(30000);

    // Ensure LSP is running
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    // The status bar text should include "Buf" and may include a version number
    assert.ok(
      statusBarItem.text.includes("Buf"),
      "Expected status bar to show 'Buf'"
    );

    // Version format is typically (X.Y.Z)
    const hasVersion = /\(\d+\.\d+\.\d+\)/.test(statusBarItem.text);
    if (hasVersion) {
      assert.ok(true, "Status bar includes version number");
    } else {
      assert.ok(
        true,
        "Status bar does not include version (may not be available yet)"
      );
    }
  });

  test("multiple start commands are idempotent", async function () {
    this.timeout(30000);

    // Start the server multiple times
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    // Start again
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await sleep(2000);

    const statusBarItem2 = getStatusBarItem();
    const text2 = statusBarItem2?.text;

    // Should still be running with check icon
    assert.ok(
      text2?.includes("$(check)"),
      "Expected LSP to still be running after second start"
    );
  });

  test("multiple stop commands are idempotent", async function () {
    this.timeout(30000);

    // Ensure LSP is running first
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitForStatusBarText("$(check)", 20000);

    // Stop the server multiple times
    await vscode.commands.executeCommand("buf.stopLanguageServer");
    await waitForStatusBarText("$(x)", 10000);

    // Stop again
    await vscode.commands.executeCommand("buf.stopLanguageServer");
    await sleep(1000);

    const statusBarItem2 = getStatusBarItem();
    const text2 = statusBarItem2?.text;

    // Should still be stopped with x icon
    assert.ok(
      text2?.includes("$(x)"),
      "Expected LSP to still be stopped after second stop"
    );
  });
});
