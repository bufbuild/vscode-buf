import assert from "node:assert";
import * as vscode from "vscode";
import { protoDoc, setupIntegrationTests } from "./setup";

suite("LSP functionality", () => {
  suiteSetup(async function () {
    this.timeout(10000);
    // Use shared setup to ensure extension is activated and LSP is ready
    await setupIntegrationTests();
  });

  test("hover shows documentation", async () => {
    assert.ok(protoDoc, "Expected protoDoc to be loaded");

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
    assert.ok(protoDoc, "Expected protoDoc to be loaded");

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
