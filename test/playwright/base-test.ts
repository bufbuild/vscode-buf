import { test as baseTest, type Page, _electron } from "@playwright/test";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from "@vscode/test-electron";
export { expect, type Page } from "@playwright/test"; // Use base expect and Page from Playwright
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

/**
 * @file Provides the basic scaffolding for testing the Buf VS Code extension.
 */

/**
 * Options for testing.
 *
 * @param vsCodeVersion is the VS Code version we want to test against. Otherwise, default
 *  to local VS Code version set in the environment and falls back to "insiders".
 *
 */
export type TestOptions = {
  vsCodeVersion: string;
};

/**
 * A helper for creating files within the test suite workspace.
 */
async function createFile(filePath: string, content: string): Promise<void> {
  // ensure the full path up to the file exists
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, content);
}

/**
 * Fixtures provided by the Playwright test.
 *
 * @param workbox a container for the VS Code test. It starts up a VS Code process for the
 *  specified VS Code version and runs the specified test.
 * @param createProject creates a VS Code project.
 * @param createTempDir creates a temp dir for testing.
 */
type TestFixtures = TestOptions & {
  workbox: {
    projectPath: string;
    createFile: typeof createFile;
    page: Page;
  };
  createProject: () => Promise<string>;
  createTempDir: () => Promise<string>;
};

/**
 * test is used to define a test that runs with {@link TestFixtures}.
 */
export const test = baseTest.extend<TestFixtures>({
  vsCodeVersion: [process.env.VSCODE_VERSION ?? "insiders", { option: true }],
  workbox: async ({ vsCodeVersion, createProject, createTempDir }, use) => {
    const defaultCachePath = await createTempDir();
    const vscodeExecutablePath = await downloadAndUnzipVSCode(vsCodeVersion);
    const [cliPath] =
      resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const projectPath = await createProject();

    const electronApp = await _electron.launch({
      executablePath: cliPath,
      args: [
        "--verbose",
        // Stolen from https://github.com/microsoft/vscode-test/blob/0ec222ef170e102244569064a12898fb203e5bb7/lib/runTest.ts#L126-L160
        // https://github.com/microsoft/vscode/issues/84238
        "--no-sandbox",
        // https://github.com/microsoft/vscode-test/issues/221
        "--disable-gpu-sandbox",
        // https://github.com/microsoft/vscode-test/issues/120
        "--disable-updates",
        "--skip-welcome",
        "--skip-release-notes",
        "--disable-workspace-trust",
        `--extensionDevelopmentPath=${path.join(__dirname, "..", "..")}`,
        `--extensions-dir=${path.join(defaultCachePath, "extensions")}`,
        `--user-data-dir=${path.join(defaultCachePath, "user-data")}`,
        projectPath,
      ],
    });

    const page = await electronApp.firstWindow();
    await page.context().tracing.start({
      screenshots: true,
      snapshots: true,
      title: test.info().title,
    });
    await use({
      page,
      projectPath,
      createFile: (filePath, content) => {
        return createFile(path.join(projectPath, filePath), content);
      },
    });
    const tracePath = test.info().outputPath("trace.zip");
    await page.context().tracing.stop({ path: tracePath });
    test.info().attachments.push({
      name: "trace",
      path: tracePath,
      contentType: "application/zip",
    });
    await electronApp.close();
    // Add a small delay on Windows to ensure processes are fully released
    if (process.platform === "win32") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const logPath = path.join(defaultCachePath, "user-data");
    if (fs.existsSync(logPath)) {
      const logOutputPath = test.info().outputPath("vscode-logs");
      await fs.promises.cp(logPath, logOutputPath, { recursive: true });
    }
  },
  createProject: async ({ createTempDir }, use) => {
    await use(async () => {
      // We want to be outside of the project directory to avoid already installed dependencies.
      const projectPath = await createTempDir();
      if (fs.existsSync(projectPath)) {
        await fs.promises.rm(projectPath, { recursive: true });
      }
      await fs.promises.mkdir(path.join(projectPath, ".vscode"), {
        recursive: true,
      });
      return projectPath;
    });
  },
  // eslint-disable-next-line no-empty-pattern
  createTempDir: async ({}, use) => {
    const tempDirs: string[] = [];
    await use(async () => {
      const tempDir = await fs.promises.realpath(
        await fs.promises.mkdtemp(path.join(os.tmpdir(), "pwtest-"))
      );
      tempDirs.push(tempDir);
      return tempDir;
    });

    // Process each temp directory
    for (const tempDir of tempDirs) {
      if (process.platform === "win32") {
        // Windows-specific cleanup with retry logic
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            await fs.promises.rm(tempDir, { recursive: true });
            break; // Success, exit the retry loop
          } catch (_error) {
            attempts++;
            if (attempts >= maxAttempts) {
              console.warn(
                `Failed to remove directory after ${maxAttempts} attempts: ${tempDir}`
              );
              break;
            }
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } else {
        // Standard cleanup for non-Windows platforms
        await fs.promises.rm(tempDir, { recursive: true });
      }
    }
  },
});
