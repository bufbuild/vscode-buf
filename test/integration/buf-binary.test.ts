import * as fs from "fs";
import * as vscode from "vscode";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import assert from "assert";
import { githubReleaseURL, Release } from "../../src/github";
import * as config from "../../src/config";
import { installBuf } from "../../src/commands/install-buf";
import { bufState } from "../../src/state";
import { LanguageServerStatus } from "../../src/status";

/**
 * msw stub handlers for GitHub releases API.
 */
const handlers = [
  http.get(githubReleaseURL, () => {}),
  // TODO: load binary from disk that matches this
  http.get(`${githubReleaseURL}tags/:tag`, ({ params }) => {
    params.tag;
  }),
];

const server = setupServer(...handlers);

suite("manage buf binary", () => {
  suiteSetup(async () => {
    server.listen();
    // Ensure that settings.json is empty so it is controlled by our test cases
    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
      fs.copyFileSync(
        `${workspaceFolder.uri.path}/.vscode/settings.json`,
        `${workspaceFolder.uri.path}/.vscode/settings.old.json`
      );
      fs.unlinkSync(`${workspaceFolder.uri.path}/.vscode/settings.json`);
    }
    // Force a reload to pick up the new configuration.
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  });

  suiteTeardown(async () => {
    server.close();
    // Restore the original settings.json file(s).
    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
      fs.copyFileSync(
        `${workspaceFolder.uri.path}/.vscode/settings.old.json`,
        `${workspaceFolder.uri.path}/.vscode/settings.json`
      );
      fs.unlinkSync(`${workspaceFolder.uri.path}/.vscode/settings.old.json`);
    }
    // Force a reload to pick up the new configuration.
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  });

  teardown(() => server.resetHandlers());

  test("no configs, use system buf on $PATH", async () => {
    const states: LanguageServerStatus[] = [];
    const subscription = bufState.onDidChangeState(() => {
      states.push(bufState.languageServerStatus);
    });
    await installBuf.execute();
    subscription.dispose();
    assert.deepStrictEqual(
      states.filter((current, index) => {
        return index === 0 || states[index - 1] !== current;
      }),
      ["LANGUAGE_SERVER_STARTING", "LANGUAGE_SERVER_RUNNING"],
      bufState.languageServerStatus
    );
  });

  test("use path", async () => {
    // await config.update("commandLine.path", bufPath);
    // Expect the server to restart
    // await config.update
  });
  test("use version config", () => {});
  suiteTeardown(() => {
    // Reset all buf.commandLine.path and buf.commandLine.version configs
    // Stop language server
  });
});
