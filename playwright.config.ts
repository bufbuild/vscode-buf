import { defineConfig } from "@playwright/test";
import type { TestOptions } from "./test/playwright/base-test";

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig<TestOptions>({
  // Directory where tests are located
  testDir: "./test/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  timeout: 120_000_000,
  expect: {
    timeout: 40_000,
  },
  projects: [
    {
      name: "VS Code insiders",
      use: {
        vsCodeVersion: "insiders",
      },
    },
  ],
});
