import { effect } from "@preact/signals-core";
import * as vscode from "vscode";
import { bufState } from "../../src/state";
import type { LanguageServerStatus } from "../../src/status";

/**
 * Shared state for integration tests.
 * The extension is activated once and the LSP is initialized once for all test suites.
 */
export let isExtensionReady = false;
export let protoDoc: vscode.TextDocument | undefined;

/**
 * Promise to track ongoing setup to prevent concurrent initialization
 */
let setupPromise: Promise<void> | undefined;

/**
 * Root-level setup that runs once before all integration tests.
 * This activates the extension, waits for the LSP to start, and ensures it's ready to handle queries.
 */
export async function setupIntegrationTests(): Promise<void> {
  // If already set up, return immediately
  if (isExtensionReady) {
    return;
  }

  // If setup is already in progress, wait for it to complete
  if (setupPromise) {
    console.log("[INTEGRATION SETUP] Setup already in progress, waiting...");
    return setupPromise;
  }

  // Start the setup and store the promise
  setupPromise = performSetup();
  return setupPromise;
}

async function performSetup(): Promise<void> {
  console.log("[INTEGRATION SETUP] Starting integration test setup...");

  // Wait for language server to be running
  const languageServerRunning = setupLanguageServerListener(
    "LANGUAGE_SERVER_RUNNING"
  );

  // Activate the extension
  console.log("[INTEGRATION SETUP] Activating extension...");
  await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

  // Wait for LSP to be running
  console.log("[INTEGRATION SETUP] Waiting for LSP to start...");
  await languageServerRunning;
  console.log("[INTEGRATION SETUP] LSP is running.");
  console.log(
    `[INTEGRATION SETUP] LSP status: ${bufState.getLanguageServerStatus()}`
  );
  console.log(
    `[INTEGRATION SETUP] Buf version: ${bufState.getBufBinaryVersion()}`
  );
  console.log(`[INTEGRATION SETUP] Buf path: ${bufState.getBufBinaryPath()}`);

  // Open a proto file to trigger LSP indexing
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Expected a workspace folder");
  }

  const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "user.proto");
  console.log(`[INTEGRATION SETUP] Opening document: ${protoUri.toString()}`);
  console.log(`[INTEGRATION SETUP] fsPath: ${protoUri.fsPath}`);
  protoDoc = await vscode.workspace.openTextDocument(protoUri);
  await vscode.window.showTextDocument(protoDoc);

  // Give the LSP a moment to register the open document before we start polling
  // This is especially important on Windows
  console.log(
    "[INTEGRATION SETUP] Waiting 2 seconds for LSP to register document..."
  );
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Poll for LSP readiness by checking if it can provide symbols
  // This is more reliable than waiting for a fixed duration, especially on slower CI/Windows environments
  console.log("[INTEGRATION SETUP] Waiting for LSP to index workspace...");
  const maxRetries = 60; // 60 attempts
  const retryDelay = 1000; // 1 second between attempts
  let isReady = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to get document symbols as a health check
      const symbols = (await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        protoDoc.uri
      )) as vscode.DocumentSymbol[];

      // Log detailed info on first attempt and periodically
      if (attempt === 1 || attempt % 10 === 0) {
        console.log(
          `[INTEGRATION SETUP] Attempt ${attempt}: symbols type: ${typeof symbols}, is array: ${Array.isArray(symbols)}, length: ${symbols?.length ?? "undefined"}`
        );
      }

      if (symbols && symbols.length > 0) {
        console.log(
          `[INTEGRATION SETUP] LSP is ready! Document symbols count: ${symbols.length} (attempt ${attempt}/${maxRetries})`
        );
        isReady = true;
        break;
      } else if (attempt % 5 === 0) {
        // Log every 5th attempt to avoid spam
        console.log(
          `[INTEGRATION SETUP] LSP not ready yet, symbols returned but empty (attempt ${attempt}/${maxRetries})`
        );
      }
    } catch (e) {
      // LSP might throw errors while initializing, keep retrying
      if (attempt % 10 === 0) {
        console.log(
          `[INTEGRATION SETUP] LSP query failed with error: ${e}, retrying... (attempt ${attempt}/${maxRetries})`
        );
      }
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  if (!isReady) {
    const lspStatus = bufState.getLanguageServerStatus();
    console.error(
      `[INTEGRATION SETUP] LSP did not become ready after ${maxRetries} attempts. Status: ${lspStatus}`
    );
    throw new Error(
      `[INTEGRATION SETUP] LSP failed to index workspace within timeout. LSP status: ${lspStatus}`
    );
  }

  // Verify the LSP is actually working with hover
  console.log("[INTEGRATION SETUP] Verifying hover functionality...");
  try {
    const testPosition = new vscode.Position(5, 10); // Position of "User" in "message User"
    const hovers = (await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      protoDoc.uri,
      testPosition
    )) as vscode.Hover[];

    if (hovers && hovers.length > 0) {
      console.log(
        "[INTEGRATION SETUP] LSP is ready and responding to hover queries."
      );
    } else {
      console.warn(
        "[INTEGRATION SETUP] Warning: LSP is running but not returning hover information."
      );
      console.warn(
        "[INTEGRATION SETUP] This may indicate the LSP is not fully initialized."
      );
      console.warn("[INTEGRATION SETUP] Tests may fail or be flaky.");
    }

    // Check diagnostics as well
    const diagnostics = vscode.languages.getDiagnostics(protoDoc.uri);
    console.log(
      `[INTEGRATION SETUP] Diagnostics for ${protoDoc.uri.fsPath}: ${diagnostics.length} issue(s)`
    );
  } catch (e) {
    console.error(`[INTEGRATION SETUP] Error verifying LSP: ${e}`);
    const lspStatus = bufState.getLanguageServerStatus();
    throw new Error(
      `[INTEGRATION SETUP] LSP verification failed. LSP status: ${lspStatus}. Error: ${e}`
    );
  }

  isExtensionReady = true;
  console.log("[INTEGRATION SETUP] Integration test setup complete.");
}

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
