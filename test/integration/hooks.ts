import { setupIntegrationTests } from "./setup";

/**
 * Root hooks for Mocha that run once before all integration tests.
 * This ensures the extension is activated and LSP is ready before any test suite runs.
 */
export const mochaHooks = {
  async beforeAll(this: Mocha.Context) {
    // Set a longer timeout for the initial setup
    this.timeout(120000); // 2 minutes
    await setupIntegrationTests();
  },
};
