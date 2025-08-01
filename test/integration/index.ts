import * as path from "node:path";
import { glob } from "glob";
import Mocha from "mocha";

/**
 * @file Provides a Mocha test suite for running extension tests in VS Code using the extension
 * test runner extension.
 * https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner
 */

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname);

  return new Promise((c, e) => {
    glob("**/**.test.js", { cwd: testsRoot })
      .then((files) => {
        // Add files to the test suite
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Run the mocha test
          mocha.run((failures) => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          e(err);
        }
      })
      .catch((err) => {
        return e(err);
      });
  });
}
