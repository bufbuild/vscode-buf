// import * as fs from "node:fs";
import * as path from "path";
// import { glob } from "glob";
import { fileURLToPath } from "url";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    files: "out/test/unit/**.test.js",
    workspaceFolder: "test/workspaces/unit",
    launchArgs: ["--disable-extensions"],
    env: {
      TEST_ENV: "env_replacement",
    },
    extensionDevelopmentPath: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "./test/workspaces/unit"
    ),
  },
  {
    files: "out/test/integration/*.test.js",
    workspaceFolder: "test/workspaces/single",
    launchArgs: ["--disable-extensions"],
  },
  // {
  //   files: "out/test/integration/*.test.js",
  //   workspaceFolder: "./test/workspaces/multi",
  // },
]);

/**
 * The directory for test workspaces.
 */
// const testDir = ".vscode-test-workspaces";

/**
 * Path to the compiled tests directory.
 */
// const compiledTests = path.join("out", "test", "integration");

/**
 * defineConfig is used by vscode-test to run the test configuration.
 * We provide a separate VSCode workspace each test file, which allows us to test for
 *
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */
// export default defineConfig(createConfig());

/**
 * A helper function for creating test configs for vscode-test. This allows us to provide
 * a separate VSCode workspace for each test file.
 */
// async function createConfig() {
//   const config = [];
//   const files = await glob("*.test.js", { cwd: compiledTests });
//   console.log(files);
//   await fs.promises.mkdir(testDir, { recursive: true });
//   const defaultOptions = await import(
//     "./" + path.join("out", "test", "integration", "options", "default.js")
//   );
//
//   for (let file of files) {
//     const optionsFilePath =
//       "./" + path.join("out", "test", "integration", "options", file);
//     let module = defaultOptions;
//     try {
//       await fs.promises.access(optionsFilePath);
//       module = await import(optionsFilePath);
//     } catch (e) {
//       console.log("no options found for test suite, using default options");
//     }
//     const testWorkspace = await createTestWorkspace(module.options);
//     console.log(module.options.env);
//     config.push({
//       label: path.basename(file),
//       files: path.join(compiledTests, file),
//       workspaceFolder: testWorkspace,
//       env: module.options.env ?? undefined,
//     });
//   }
//   return config;
// }

/**
 * Creates the VSCode workspace used for the test based on the specified suite options.
 * This creates a temp directory for the workspace, the files for the workspace, and the
 * settings.json.
 */
// async function createTestWorkspace(suiteOptions) {
//   const { fileContents, settings } = suiteOptions;
//   const dir = await fs.promises.mkdtemp(testDir + "/");
//   for (let [name, content] of Object.entries(fileContents)) {
//     await fs.promises.writeFile(path.join(dir, name), content);
//   }
//   await fs.promises.mkdir(path.join(dir, ".vscode"));
//   await fs.promises.writeFile(
//     path.join(dir, ".vscode", "settings.json"),
//     JSON.stringify(settings)
//   );
//   return dir;
// }
