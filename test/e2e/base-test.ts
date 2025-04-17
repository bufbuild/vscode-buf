import { test as baseTest, type Page, _electron } from "@playwright/test";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from "@vscode/test-electron";
export { expect } from "@playwright/test";
import path from "path";
import fs from "fs";

export type TestOptions = {
  vsCodeVersion: string;
};

type TestFixtures = TestOptions & {
  workbox: Page;
  createProject: () => Promise<string>;
  createTempDir: () => Promise<string>;
};

export const test = baseTest.extend<TestFixtures>({
  vsCodeVersion: ["insiders", { option: true }],
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

    const workbox = await electronApp.firstWindow();
    await workbox.context().tracing.start({
      screenshots: true,
      snapshots: true,
      title: test.info().title,
    });
    await use(workbox);
    const tracePath = test.info().outputPath("trace.zip");
    await workbox.context().tracing.stop({ path: tracePath });
    test.info().attachments.push({
      name: "trace",
      path: tracePath,
      contentType: "application/zip",
    });
    await electronApp.close();
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
      if (fs.existsSync(projectPath))
        await fs.promises.rm(projectPath, { recursive: true });
      await fs.promises.mkdir(path.join(projectPath, ".vscode"), {
        recursive: true,
      });
      // Setup some default settings for the project.
      await fs.promises.appendFile(
        path.join(projectPath, ".vscode", "settings.json"),
        JSON.stringify({
          git: {
            openRepositoryInParentFolders: true,
          },
        })
      );
      return projectPath;
    });
  },
  // eslint-disable-next-line no-empty-pattern
  createTempDir: async ({}, use) => {
    const tempDirs: string[] = [];
    await use(async () => {
      const tempDir = await fs.promises.realpath(
        await fs.promises.mkdtemp(
          path.join(process.cwd(), "test-workspaces", "pwtest-")
        )
      );
      tempDirs.push(tempDir);
      return tempDir;
    });
    for (const tempDir of tempDirs)
      await fs.promises.rm(tempDir, { recursive: true });
  },
});
