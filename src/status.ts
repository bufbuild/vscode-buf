/**
 * @file Provides the status type definitions for BufState.
 *
 * Instead of using Typescript enums, we use a type inference on an exported const array
 * of strings. We use this pattern because the Javascript compiled from Typescript enums
 * do not provide a developer-friendly API (e.g. they cannot be iterated over safely).
 */

const _languageServerStatus = [
  "LANGUAGE_SERVER_DISABLED",
  "LANGUAGE_SERVER_STARTING",
  "LANGUAGE_SERVER_RUNNING",
  "LANGUAGE_SERVER_STOPPED",
  "LANGUAGE_SERVER_ERRORED",
] as const;

/**
 * LanguageServerStatus represents the status of the LSP server.
 * Commands that interact with the LSP server set this status.
 * The status bar displays an icon based on this status.
 */
export type LanguageServerStatus = (typeof _languageServerStatus)[number];

const _extensionStatus = ["EXTENSION_PROCESSING", "EXTENSION_IDLE"] as const;

/**
 * ExtensionStatus represents the status of the extension.
 * When commands are processing work, the status should reflect a busy status.
 * The status bar displays spinner when the extension is busy.
 */
export type ExtensionStatus = (typeof _extensionStatus)[number];
