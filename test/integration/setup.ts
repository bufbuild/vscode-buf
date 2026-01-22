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

  // Give the LSP some time to index the workspace
  // We use 15 seconds to accommodate slower CI environments
  console.log(
    "[INTEGRATION SETUP] Giving LSP time to index workspace (15 seconds)..."
  );
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Verify the LSP is actually working
  console.log("[INTEGRATION SETUP] Verifying LSP is responding...");
  try {
    // Check diagnostics first
    const diagnostics = vscode.languages.getDiagnostics(protoDoc.uri);
    console.log(
      `[INTEGRATION SETUP] Diagnostics for ${protoDoc.uri.fsPath}: ${diagnostics.length} issue(s)`
    );
    if (diagnostics.length > 0) {
      console.log(
        "[INTEGRATION SETUP] Diagnostics:",
        diagnostics.map((d) => `${d.severity}: ${d.message}`).join(", ")
      );
    }

    // Try to get document symbols as a basic health check
    const symbols = (await vscode.commands.executeCommand(
      "vscode.executeDocumentSymbolProvider",
      protoDoc.uri
    )) as vscode.DocumentSymbol[];
    console.log(
      `[INTEGRATION SETUP] Document symbols count: ${symbols?.length ?? 0}`
    );
    if (!symbols || symbols.length === 0) {
      console.warn(
        "[INTEGRATION SETUP] Warning: LSP returned no document symbols"
      );
    }

    // Try hover as a final check
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
        "[INTEGRATION SETUP] This may indicate the LSP is not indexing proto files correctly."
      );
      console.warn("[INTEGRATION SETUP] Tests may fail or be flaky.");
    }
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
