import * as vscode from "vscode";
import { getStatusBarItem } from "../../src/status-bar";

/**
 * Wait for a file to be created with a timeout.
 * @param uri The URI of the file to wait for
 * @param timeout Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when the file exists
 */
export async function waitForFile(
  uri: vscode.Uri,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await vscode.workspace.fs.stat(uri);
      return; // File exists
    } catch {
      // File doesn't exist yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timeout waiting for file: ${uri.fsPath} after ${timeout}ms`);
}

/**
 * Check if a file exists.
 * @param uri The URI of the file to check
 * @returns Promise that resolves to true if the file exists, false otherwise
 */
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for diagnostics to appear for a given document with a timeout.
 * @param uri The URI of the document to check diagnostics for
 * @param timeout Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves with the diagnostics
 */
export async function waitForDiagnostics(
  uri: vscode.Uri,
  timeout = 5000
): Promise<vscode.Diagnostic[]> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    if (diagnostics.length > 0) {
      return diagnostics;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timeout waiting for diagnostics for ${uri.fsPath} after ${timeout}ms`
  );
}

/**
 * Wait for the LSP to reach running state with a timeout.
 * @param timeout Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when LSP is running
 */
export async function waitForLspRunning(timeout = 10000): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const statusBarItem = getStatusBarItem();
    if (statusBarItem?.text.includes("$(check)")) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timeout waiting for LSP to start after ${timeout}ms`);
}

/**
 * Find the position of text in a document.
 * @param document The document to search in
 * @param text The text to find
 * @returns The position of the first character of the text, or undefined if not found
 */
export function findPositionOfText(
  document: vscode.TextDocument,
  text: string
): vscode.Position | undefined {
  const documentText = document.getText();
  const index = documentText.indexOf(text);
  if (index === -1) {
    return undefined;
  }
  return document.positionAt(index);
}

/**
 * Wait for a specific amount of time.
 * @param ms Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a directory to be created with a timeout.
 * @param uri The URI of the directory to wait for
 * @param timeout Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when the directory exists
 */
export async function waitForDirectory(
  uri: vscode.Uri,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        return;
      }
    } catch {
      // Directory doesn't exist yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timeout waiting for directory: ${uri.fsPath} after ${timeout}ms`
  );
}

/**
 * Read the contents of a file as a UTF-8 string.
 * @param uri The URI of the file to read
 * @returns Promise that resolves with the file contents
 */
export async function readFileContents(uri: vscode.Uri): Promise<string> {
  const content = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(content).toString("utf8");
}

/**
 * Wait for the status bar to contain specific text.
 * @param expectedText Text that should be in the status bar
 * @param timeout Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when the status bar contains the expected text
 */
export async function waitForStatusBarText(
  expectedText: string,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const statusBarItem = getStatusBarItem();
    if (statusBarItem?.text.includes(expectedText)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timeout waiting for status bar text "${expectedText}" after ${timeout}ms`
  );
}
