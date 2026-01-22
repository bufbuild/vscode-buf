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

  // Open a proto file to trigger LSP indexing
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Expected a workspace folder");
  }

  const protoUri = vscode.Uri.joinPath(workspaceFolder.uri, "user.proto");
  protoDoc = await vscode.workspace.openTextDocument(protoUri);
  await vscode.window.showTextDocument(protoDoc);

  // Wait for LSP to actually index the file and be ready for queries
  // We poll for hover information to confirm LSP is ready
  // CI environments may be slower, so we use a longer timeout
  const maxAttempts = 90; // 90 seconds max (increased from 40 for CI)
  let attempts = 0;
  let lspReady = false;

  console.log("[INTEGRATION SETUP] Waiting for LSP to index proto files...");
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
          `[INTEGRATION SETUP] LSP ready after ${attempts} second(s). Tests can now run.`
        );
      } else if (attempts % 10 === 0) {
        // Log every 10 seconds
        console.log(
          `[INTEGRATION SETUP] Still waiting for LSP... (${attempts}/${maxAttempts} seconds)`
        );
      }
    } catch (_e) {
      if (attempts % 10 === 0) {
        console.log(
          `[INTEGRATION SETUP] Still waiting for LSP... (${attempts}/${maxAttempts} seconds)`
        );
      }
    }
  }

  if (!lspReady) {
    const lspStatus = bufState.getLanguageServerStatus();
    throw new Error(
      `[INTEGRATION SETUP] LSP did not become ready after ${maxAttempts} seconds. LSP status: ${lspStatus}. The language server may not be indexing proto files correctly.`
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
