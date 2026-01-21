import assert from "node:assert";
import { effect } from "@preact/signals-core";
import * as vscode from "vscode";
import { bufState } from "../../src/state";
import type { LanguageServerStatus } from "../../src/status";

suite("LSP functionality", () => {
  let protoDoc: vscode.TextDocument;

  suiteSetup(async function () {
    // Increase timeout for initial setup (needs to be longer than polling time)
    this.timeout(60000);

    // Wait for language server to be running
    const languageServerRunning = setupLanguageServerListener(
      "LANGUAGE_SERVER_RUNNING"
    );

    // Activate the extension
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

    // Wait for LSP to be ready
    await languageServerRunning;

    // Open the user.proto file
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "user.proto");
    protoDoc = await vscode.workspace.openTextDocument(protoUri);
    await vscode.window.showTextDocument(protoDoc);

    // Wait for LSP to actually index the file and be ready for queries
    // We poll for hover information to confirm LSP is ready
    const maxAttempts = 40; // 40 seconds max
    let attempts = 0;
    let lspReady = false;

    console.log("[LSP TEST] Waiting for LSP to index the proto file...");
    while (attempts < maxAttempts && !lspReady) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      try {
        // Try to get hover information as a health check
        const testPosition = new vscode.Position(5, 10); // Position of "User" in "message User"
        const hovers = (await vscode.commands.executeCommand(
          "vscode.executeHoverProvider",
          protoDoc.uri,
          testPosition
        )) as vscode.Hover[];

        if (hovers && hovers.length > 0) {
          lspReady = true;
          console.log(
            `[LSP TEST] LSP ready after ${attempts} second(s). Hover returned ${hovers.length} result(s).`
          );
        } else if (attempts % 5 === 0) {
          // Log every 5 seconds
          console.log(
            `[LSP TEST] Still waiting for LSP... (${attempts}/${maxAttempts} seconds)`
          );
        }
      } catch (e) {
        if (attempts % 5 === 0) {
          console.log(
            `[LSP TEST] Still waiting for LSP... (${attempts}/${maxAttempts} seconds, error: ${e})`
          );
        }
      }
    }

    if (!lspReady) {
      const lspStatus = bufState.getLanguageServerStatus();
      throw new Error(
        `LSP did not become ready after ${maxAttempts} seconds. LSP status: ${lspStatus}. The language server may not be indexing proto files correctly.`
      );
    }
  });

  test("hover shows documentation", async () => {
    // Find the position of "User" in the User message definition (line 5)
    const position = new vscode.Position(5, 10); // Position of "User" in "message User"

    const hovers = (await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      protoDoc.uri,
      position
    )) as vscode.Hover[];

    assert.ok(hovers && hovers.length > 0, "Expected hover information");

    // Check that the hover contains the documentation comment
    const hoverText = hovers[0].contents
      .map((content) => {
        if (typeof content === "string") {
          return content;
        }
        return content.value;
      })
      .join("\n");

    assert.ok(
      hoverText.includes("User represents a user in the system"),
      `Expected hover to contain documentation comment, got: ${hoverText}`
    );
  });

  test("go to definition", async () => {
    // Find the position of "User" in GetUserResponse (line 27)
    // Line: "  User user = 1;"
    // The "User" type starts at column 2 (0-indexed)
    const position = new vscode.Position(26, 2); // Position of "User" in "User user = 1;"

    const locations = (await vscode.commands.executeCommand(
      "vscode.executeDefinitionProvider",
      protoDoc.uri,
      position
    )) as vscode.Location[] | vscode.LocationLink[];

    assert.ok(
      locations && locations.length > 0,
      "Expected definition location"
    );

    // Handle both Location and LocationLink
    let definitionUri: vscode.Uri;
    let definitionLine: number;

    if ("targetUri" in locations[0]) {
      // LocationLink
      const link = locations[0] as vscode.LocationLink;
      definitionUri = link.targetUri;
      definitionLine = link.targetRange.start.line;
    } else {
      // Location
      const location = locations[0] as vscode.Location;
      definitionUri = location.uri;
      definitionLine = location.range.start.line;
    }

    // Check that it navigates to the User message definition
    assert.strictEqual(
      definitionUri.toString(),
      protoDoc.uri.toString(),
      "Expected definition to be in the same file"
    );

    // The User message definition starts at line 6 (0-indexed: line 5)
    assert.strictEqual(
      definitionLine,
      5,
      "Expected definition to be at line 6 (0-indexed: 5)"
    );
  });

  test("format document", async () => {
    // Create an unformatted proto file
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Expected a workspace folder");

    const unformattedContent = `syntax = "proto3";

package example.v1;

message TestFormat {
  string field1   =   1;
  int32   field2=2;
}
`;

    const unformattedUri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "unformatted.proto"
    );

    // Create the file
    await vscode.workspace.fs.writeFile(
      unformattedUri,
      Buffer.from(unformattedContent)
    );

    // Open the unformatted file
    const unformattedDoc =
      await vscode.workspace.openTextDocument(unformattedUri);
    await vscode.window.showTextDocument(unformattedDoc);

    // Wait a bit for LSP to pick up the new file
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Format the document
    const edits = (await vscode.commands.executeCommand(
      "vscode.executeFormatDocumentProvider",
      unformattedDoc.uri
    )) as vscode.TextEdit[];

    assert.ok(edits && edits.length > 0, "Expected formatting edits");

    // Apply the edits
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(unformattedDoc.uri, edits);
    await vscode.workspace.applyEdit(workspaceEdit);

    // Save the document
    await unformattedDoc.save();

    // Check that the file is now formatted correctly
    const formattedContent = unformattedDoc.getText();

    // The formatted version should have consistent spacing
    assert.ok(
      formattedContent.includes("string field1 = 1;"),
      "Expected field1 to be formatted with proper spacing"
    );
    assert.ok(
      formattedContent.includes("int32 field2 = 2;"),
      "Expected field2 to be formatted with proper spacing"
    );

    // Clean up the test file
    await vscode.workspace.fs.delete(unformattedUri);
  });
});

/**
 * A helper function that returns a Promise listening for the language server status. Once
 * the language server is the status we want to listen for, the promise resolves. If the
 * language server is in an uninstalled or errored state, the Promise rejects.
 */
function setupLanguageServerListener(
  listenFor: LanguageServerStatus
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  let dispose: (() => void) | undefined;
  dispose = effect(() => {
    const languageServerStatus = bufState.getLanguageServerStatus();
    if (languageServerStatus === listenFor) {
      resolve();
      dispose?.();
    }
    if (languageServerStatus === "LANGUAGE_SERVER_ERRORED") {
      reject(
        new Error(`language server in failed state: ${languageServerStatus}`)
      );
      dispose?.();
    }
  });
  return promise;
}
