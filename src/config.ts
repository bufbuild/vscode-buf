import * as vscode from "vscode";

import { homedir } from "os";

/**
 * @file Provides utilities for interacting with the VSCode extension configuration.
 *
 * Extension configurations are defined in package.json.
 */

/**
 * Gets the config value `buf.<key>`.
 * Applies ${variable} substitutions {@link substitute}.
 */
export function get<T>(key: string): T | undefined {
  return substitute(vscode.workspace.getConfiguration("buf").get<T>(key));
}

/**
 * Sets the config value `buf.<key>`. Does not apply substitutions {@link substitute}.
 */
export function update<T>(
  key: string,
  value: T,
  target?: vscode.ConfigurationTarget
) {
  return vscode.workspace.getConfiguration("buf").update(key, value, target);
}

/**
 * Traverse configuration values and replace useful variable references supported in VSCode.
 * https://code.visualstudio.com/docs/editor/variables-reference
 *
 * Supported references:
 * ${userHome}
 * ${cwd}
 * ${env:VAR} https://code.visualstudio.com/docs/reference/variables-reference#_environment-variables
 * ${config:KEY} https://code.visualstudio.com/docs/reference/variables-reference#_configuration-variables
 */
function substitute<T>(val: T): T {
  if (typeof val === "string") {
    val = val.replace(/\$\{(.*?)\}/g, (match, directive) => {
      // If there's no replacement available, keep the placeholder.
      return replacement(directive) ?? match;
    }) as unknown as T;
  } else if (Array.isArray(val)) {
    val = val.map((x) => substitute(x)) as unknown as T;
  } else if (typeof val === "object" && val !== null) {
    // Substitute values but not keys, so we don't deal with collisions.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as { [k: string]: any };
    for (const [k, v] of Object.entries(val)) {
      result[k] = substitute(v);
    }
    val = result as T;
  }
  return val;
}

/**
 * Subset of substitution variables that are most likely to be useful.
 * https://code.visualstudio.com/docs/editor/variables-reference
 */
function replacement(directive: string): string | undefined {
  if (directive === "userHome") {
    return homedir();
  }
  if (directive === "cwd") {
    return process.cwd();
  }
  const envPrefix = "env:";
  if (directive.startsWith(envPrefix)) {
    return process.env[directive.substring(envPrefix.length)] ?? undefined;
  }
  const configPrefix = "config:";
  if (directive.startsWith(configPrefix)) {
    const config = vscode.workspace
      .getConfiguration()
      .get(directive.substring(configPrefix.length));
    return typeof config === "string" ? config : undefined;
  }
  return undefined;
}
