import * as cp from "node:child_process";

import { promisify } from "node:util";

/**
 * @file Provides shared helpers for the extension.
 */

/**
 * Wraps {@link cp.execFile} into an async call.
 */
export const execFile = promisify(cp.execFile);
