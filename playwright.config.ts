import { defineConfig } from "@playwright/test";
import { TestOptions } from "./test/e2e/base-test";

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig<TestOptions>({
  // Directory where tests are located
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  timeout: 120_000_000,
  expect: {
    timeout: 40_000,
  },
  globalSetup: "./test/e2e/global-setup.ts",
  projects: [
    {
      name: "VSCode insiders",
      use: {
        vsCodeVersion: "insiders",
      },
    },
  ],
});
