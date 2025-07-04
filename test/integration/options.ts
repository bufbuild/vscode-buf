/**
 * Options for the VSCode extension tests. Each test file, <name>.test.ts is run with their
 * corresponding suite options, options/<name>.test.ts.
 *
 * If a test suite does not provide test options for a test suite, then... TODO
 *
 * TODO: get rid of this requirement
 * Each <name>.test.ts file MUST have a corresponding <name>.options.ts file.
 *
 * A separate VSCode workspace and settings.json file is created for each test and its
 * SuiteOptions, and the test launches a fresh instance of VSCode for each test file.
 *
 * @param fileContents is a map of file name to file contents for the VSCode test workspace.
 * @param settings is a map of settings.json configurations.
 */
export type SuiteOptions = {
  fileContents: Record<string, string>; // fileName: fileContents
  settings: Record<string, any>;
  env?: Record<string, string>;
};
