// This file is run before all tests are run and is just used to prep 
// the environment for the tests. It is run only once regardless of how
// many workers are invoked.

import { downloadAndUnzipVSCode } from "@vscode/test-electron";

await downloadAndUnzipVSCode("insiders");
