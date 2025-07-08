/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/
import { glob } from "glob";
import Mocha from "mocha";
import * as path from "path";
export function run(): Promise<void> {
  const options: Mocha.MochaOptions = {
    grep: process.env.MOCHA_GREP,
    ui: "tdd",
  };
  if (process.env.MOCHA_TIMEOUT) {
    options.timeout = Number(process.env.MOCHA_TIMEOUT);
  }
  const mocha = new Mocha(options);

  // @types/mocha is outdated
  (mocha as any).color(true);

  const testsRoot = path.resolve(__dirname, "..");

  return new Promise((c, e) => {
    glob("unit/**/**.test.js", { cwd: testsRoot }).then((files) => {
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
    });
  });
}
