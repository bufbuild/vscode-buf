import * as os from "os";
import * as vscode from "vscode";

export const extensionId = "bufbuild.vscode-buf";

export const bufFilename = os.platform() === "win32" ? "buf.exe" : "buf";

export const minBufVersion = "v1.43.0";

export const githubReleaseURL =
  "https://api.github.com/repos/bufbuild/buf/releases/";
export const installURL = "https://buf.build/docs/cli/installation/";

export const protoDocumentSelector = [{ scheme: "file", language: "proto" }];

export const bufDocumentSelector = [
  { language: "buf", scheme: "file", pattern: "**/buf.yaml" },
];

export const isBufDocument = (document: vscode.TextDocument) => {
  return vscode.languages.match(bufDocumentSelector, document);
};
