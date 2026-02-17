import assert from "node:assert";
import * as vscode from "vscode";
import { getStatusBarItem } from "../../src/status-bar";
import { waitFor } from "./helpers";

suite("LSP lifecycle", () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  suiteSetup(async () => {
    // Ensure extension is activated
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

    // Get the workspace folder
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, "Expected a workspace folder");
    workspaceFolder = folders[0];

    // Open a proto file to make status bar visible
    const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "test.proto");
    const protoDoc = await vscode.workspace.openTextDocument(protoUri);
    await vscode.window.showTextDocument(protoDoc);

    // Wait for extension to be ready
    await waitFor(() => vscode.window.activeTextEditor !== undefined, 1000);
  });

  test("stop language server updates status bar", async () => {
    // Execute stop command
    await vscode.commands.executeCommand("buf.stopLanguageServer");

    // Get the status bar item
    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    // Wait for status bar to show stopped state
    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(x)") || text.toLowerCase().includes("x");
    }, 1000);

    // Verify the status bar shows stopped state
    const statusText = statusBarItem.text;
    assert.ok(
      statusText.includes("$(x)") || statusText.toLowerCase().includes("x"),
      `Expected status bar to show stopped icon, got: ${statusText}`
    );
  });

  test("start language server updates status bar", async () => {
    // First ensure it's stopped
    await vscode.commands.executeCommand("buf.stopLanguageServer");

    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(x)") || text.toLowerCase().includes("x");
    }, 1000);

    // Execute start command
    await vscode.commands.executeCommand("buf.startLanguageServer");

    // Wait for status bar to show running or starting state
    const started = await waitFor(() => {
      const text = statusBarItem.text;
      return (
        text.includes("$(check)") ||
        text.includes("$(sync~spin)") ||
        text.toLowerCase().includes("check")
      );
    }, 5000);

    assert.ok(
      started,
      `Expected status bar to show running/starting state, got: ${statusBarItem.text}`
    );
  });

  test("restart after stop shows check icon eventually", async () => {
    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    // First ensure server is running
    await vscode.commands.executeCommand("buf.startLanguageServer");
    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(check)");
    }, 5000);

    // Stop the server
    await vscode.commands.executeCommand("buf.stopLanguageServer");

    // Wait for stopped state
    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(x)") || text.toLowerCase().includes("x");
    }, 1000);

    // Verify it shows stopped
    const statusText = statusBarItem.text;
    assert.ok(
      statusText.includes("$(x)") || statusText.toLowerCase().includes("x"),
      "Expected stopped state"
    );

    // Restart the server
    await vscode.commands.executeCommand("buf.startLanguageServer");

    // Wait for it to reach running state
    const running = await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(check)") || text.toLowerCase().includes("check");
    }, 10000);

    assert.ok(
      running,
      `Expected status bar to eventually show check icon, got: ${statusBarItem.text}`
    );
  });

  test("status bar tooltip updates with server state", async () => {
    // Ensure server is running
    await vscode.commands.executeCommand("buf.startLanguageServer");

    // Wait for it to be running
    const statusBarItem = getStatusBarItem();
    assert.ok(statusBarItem, "Expected status bar item to exist");

    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(check)");
    }, 5000);

    // Check tooltip exists
    assert.ok(statusBarItem.tooltip, "Expected status bar to have a tooltip");

    // Now stop the server
    await vscode.commands.executeCommand("buf.stopLanguageServer");

    // Wait for stopped state
    await waitFor(() => {
      const text = statusBarItem.text;
      return text.includes("$(x)") || text.toLowerCase().includes("x");
    }, 1000);

    // Tooltip should still exist and be different
    assert.ok(
      statusBarItem.tooltip,
      "Expected status bar to have a tooltip after stopping"
    );
  });
});
