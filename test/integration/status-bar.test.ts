import assert from "node:assert";
import * as vscode from "vscode";
import { getStatusBarItem, isStatusBarItemVisible } from "../../src/status-bar";
import { setupIntegrationTests } from "./setup";

suite("status bar visibility", () => {
  suiteSetup(async function () {
    this.timeout(10000);
    // Use shared setup to ensure extension is activated and LSP is ready
    await setupIntegrationTests();
  });

  test("status bar item exists after activation", async () => {
    const statusBarItem = getStatusBarItem();
    assert.ok(
      statusBarItem,
      "Expected status bar item to exist after activation"
    );
  });

  test("status bar visible on proto file", async () => {
    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    // Open the proto file
    const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "test.proto");
    const protoDoc = await vscode.workspace.openTextDocument(protoUri);
    await vscode.window.showTextDocument(protoDoc);

    // Wait for the status bar to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify the active editor is showing the proto file
    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor, "Expected an active editor");
    assert.strictEqual(
      activeEditor.document.languageId,
      "proto",
      "Expected proto language"
    );

    // Verify status bar is visible
    assert.strictEqual(
      isStatusBarItemVisible(),
      true,
      "Expected status bar to be visible on proto file"
    );
  });

  test("status bar hidden on markdown file", async () => {
    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    // Open the markdown file
    const markdownUri = vscode.Uri.joinPath(workspaceFolder.uri, "README.md");
    const markdownDoc = await vscode.workspace.openTextDocument(markdownUri);
    await vscode.window.showTextDocument(markdownDoc);

    // Wait for the status bar to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify the active editor is showing the markdown file
    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor, "Expected an active editor");
    assert.strictEqual(
      activeEditor.document.languageId,
      "markdown",
      "Expected markdown language"
    );

    // Verify status bar is hidden
    assert.strictEqual(
      isStatusBarItemVisible(),
      false,
      "Expected status bar to be hidden on markdown file"
    );
  });

  test("status bar visible on buf.yaml file", async () => {
    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    // Create and open a buf.yaml file
    const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");

    // Create the file first
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      bufYamlUri,
      encoder.encode("version: v1\n")
    );

    const bufYamlDoc = await vscode.workspace.openTextDocument(bufYamlUri);
    await vscode.window.showTextDocument(bufYamlDoc);

    // Wait for the status bar to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor, "Expected an active editor");

    // Verify status bar is visible
    assert.strictEqual(
      isStatusBarItemVisible(),
      true,
      "Expected status bar to be visible on buf.yaml file"
    );
  });

  test("status bar toggles when switching between proto and markdown", async () => {
    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    // Open proto file first
    const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "test.proto");
    const protoDoc = await vscode.workspace.openTextDocument(protoUri);
    await vscode.window.showTextDocument(protoDoc);
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.strictEqual(
      isStatusBarItemVisible(),
      true,
      "Expected status bar to be visible on proto file"
    );

    // Switch to markdown file
    const markdownUri = vscode.Uri.joinPath(workspaceFolder.uri, "README.md");
    const markdownDoc = await vscode.workspace.openTextDocument(markdownUri);
    await vscode.window.showTextDocument(markdownDoc);
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.strictEqual(
      isStatusBarItemVisible(),
      false,
      "Expected status bar to be hidden on markdown file"
    );

    // Switch back to proto file
    await vscode.window.showTextDocument(protoDoc);
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.strictEqual(
      isStatusBarItemVisible(),
      true,
      "Expected status bar to be visible again on proto file"
    );
  });
});
