import * as vscode from "vscode";

/**
 * TODO: all consts in this file are now unused, figure out what to do with them
 */

export const minBufVersion = "v1.43.0";

export const bufDocumentSelector = [
  { language: "buf", scheme: "file", pattern: "**/buf.yaml" },
];

export const isBufDocument = (document: vscode.TextDocument) => {
  return vscode.languages.match(bufDocumentSelector, document);
};
