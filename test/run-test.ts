import * as path from "path";
import { SilentReporter, runTests } from "@vscode/test-electron";

async function main() {
  // Disable chatty electron's DBUS errors by unsetting this env var.
  // DBUS is not required. https://github.com/microsoft/vscode-test/issues/127
  process.env["DBUS_SESSION_BUS_ADDRESS"] = "";

  // The folder containing the Extension Manifest package.json
  // Passed to `--extensionDevelopmentPath`
  const extensionDevelopmentPath = path.resolve(__dirname, "../../");

  let failed = false;

  const version = process.env.CODE_VERSION || undefined;

  try {
    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./unit/index");

    // Download VS Code, unzip it and run the unit tests
    await runTests({
      version,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        "--disable-extensions",
        "--profile-temp",
        // https://github.com/microsoft/vscode/issues/115794#issuecomment-774283222
        "--force-disable-user-env",
      ],
      reporter: new SilentReporter(), // Suppress vscode download progress report
    });
  } catch (err) {
    console.error("Failed to run unit tests: " + err);
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }
}

main();
