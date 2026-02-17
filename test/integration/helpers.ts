import * as vscode from "vscode";

/**
 * Helper to find the position of a specific text in a document.
 * Useful for LSP operations like go-to-definition and hover.
 */
export function findPositionOfText(
  doc: vscode.TextDocument,
  text: string
): vscode.Position | undefined {
  const docText = doc.getText();
  const index = docText.indexOf(text);
  if (index === -1) {
    return undefined;
  }
  return doc.positionAt(index);
}

/**
 * Helper to execute a command and wait for a file to be created.
 * Retries with timeout to allow for async operations.
 */
export async function executeCommandAndWaitForFile(
  command: string,
  uri: vscode.Uri,
  timeoutMs = 5000
): Promise<boolean> {
  await vscode.commands.executeCommand(command);

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      // File doesn't exist yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return false;
}

/**
 * Helper to find a specific diagnostic in the workspace.
 */
export function findDiagnostic(
  uri: vscode.Uri,
  predicate: (diagnostic: vscode.Diagnostic) => boolean
): vscode.Diagnostic | undefined {
  const diagnostics = vscode.languages.getDiagnostics(uri);
  return diagnostics.find(predicate);
}

/**
 * Helper to wait for a condition to be true with retry logic.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
