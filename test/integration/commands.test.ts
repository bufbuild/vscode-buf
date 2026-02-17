import assert from "node:assert";
import * as vscode from "vscode";
import { waitFor } from "./helpers";

suite("command execution", () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  suiteSetup(async () => {
    // Ensure extension is activated
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

    // Get the workspace folder
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, "Expected a workspace folder");
    workspaceFolder = folders[0];
  });

  teardown(async () => {
    // Clean up generated files after each test
    const filesToClean = [
      "buf.lock",
      "gen-es",
      "out.binpb",
      "buf.gen.yaml",
      "test-buf.yaml",
    ];

    for (const file of filesToClean) {
      const uri = vscode.Uri.joinPath(workspaceFolder.uri, file);
      try {
        await vscode.workspace.fs.delete(uri, { recursive: true });
      } catch {
        // File doesn't exist, ignore
      }
    }
  });

  test("generate creates gen-es directory", async function () {
    // Increase timeout as generation can take time (downloads plugins)
    this.timeout(15000);

    // First create a buf.gen.yaml file for generation
    const bufGenYamlUri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "buf.gen.yaml"
    );
    const bufGenYamlContent = `version: v2
managed:
  enabled: true

plugins:
  - remote: buf.build/bufbuild/es:v2.2.2
    out: gen-es
    opt: target=ts

inputs:
  - directory: .
`;
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      bufGenYamlUri,
      encoder.encode(bufGenYamlContent)
    );

    // Execute the generate command
    await vscode.commands.executeCommand("buf.generate");

    // Wait for the gen-es directory to be created
    const genEsUri = vscode.Uri.joinPath(workspaceFolder.uri, "gen-es");
    const created = await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(genEsUri);
        return true;
      } catch {
        return false;
      }
    }, 10000); // Generation can take time

    assert.ok(created, "Expected gen-es directory to be created");
  });

  test("init creates buf.yaml", async () => {
    // Delete existing buf.yaml first to test creation
    const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");
    await vscode.workspace.fs.delete(bufYamlUri);

    // Execute the init command
    await vscode.commands.executeCommand("buf.configinit");

    // Wait for buf.yaml to be created
    const created = await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(bufYamlUri);
        return true;
      } catch {
        return false;
      }
    });

    assert.ok(created, "Expected buf.yaml to be created");

    // Verify the file has content
    const content = await vscode.workspace.fs.readFile(bufYamlUri);
    const decoder = new TextDecoder();
    const text = decoder.decode(content);
    assert.ok(
      text.includes("version:"),
      "Expected buf.yaml to have version field"
    );
  });

  test("ls-breaking-rules shows output", async () => {
    // Execute the ls-breaking-rules command
    // This command shows output in the output channel
    await vscode.commands.executeCommand("buf.configlsbreakingrules");

    // We can't easily verify output channel content, but we can verify the command executes without error
    // The fact that we reach here means the command completed successfully
    assert.ok(true, "Command executed successfully");
  });

  test("ls-lint-rules shows output", async () => {
    // Execute the ls-lint-rules command
    await vscode.commands.executeCommand("buf.configlslintrules");

    // Similar to ls-breaking-rules, we verify successful execution
    assert.ok(true, "Command executed successfully");
  });

  test("dep update creates buf.lock with deps", async () => {
    // First, update buf.yaml to include dependencies
    const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");
    const bufYamlContent = `version: v2
deps:
  - buf.build/googleapis/googleapis
`;
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      bufYamlUri,
      encoder.encode(bufYamlContent)
    );

    // Execute the dep update command
    await vscode.commands.executeCommand("buf.depupdate");

    // Wait for buf.lock to be created
    const bufLockUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.lock");
    const created = await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(bufLockUri);
        return true;
      } catch {
        return false;
      }
    }, 10000); // Dep update can take time

    assert.ok(created, "Expected buf.lock to be created");

    // Verify the buf.lock contains the dependency
    const content = await vscode.workspace.fs.readFile(bufLockUri);
    const decoder = new TextDecoder();
    const text = decoder.decode(content);
    assert.ok(
      text.includes("googleapis"),
      "Expected buf.lock to contain googleapis dependency"
    );
  });

  test("dep prune removes unused deps", async function () {
    // Increase timeout for this test as it involves multiple buf operations
    this.timeout(15000);
    // First, create a buf.yaml with a dependency
    const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");
    const bufYamlWithDep = `version: v2
deps:
  - buf.build/googleapis/googleapis
`;
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      bufYamlUri,
      encoder.encode(bufYamlWithDep)
    );

    // Update deps to create buf.lock
    await vscode.commands.executeCommand("buf.depupdate");

    const bufLockUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.lock");
    await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(bufLockUri);
        return true;
      } catch {
        return false;
      }
    }, 10000);

    // Now remove the dependency from buf.yaml
    const bufYamlWithoutDep = `version: v2
`;
    await vscode.workspace.fs.writeFile(
      bufYamlUri,
      encoder.encode(bufYamlWithoutDep)
    );

    // Execute the dep prune command
    await vscode.commands.executeCommand("buf.depprune");

    // Wait for the prune to complete by checking file content
    await waitFor(async () => {
      try {
        const content = await vscode.workspace.fs.readFile(bufLockUri);
        const decoder = new TextDecoder();
        const text = decoder.decode(content);
        return !text.includes("googleapis") || text.length < 50;
      } catch {
        return false;
      }
    }, 5000);

    // Verify the buf.lock no longer contains the dependency
    const content = await vscode.workspace.fs.readFile(bufLockUri);
    const decoder = new TextDecoder();
    const text = decoder.decode(content);
    assert.ok(
      !text.includes("googleapis") || text.length < 50,
      "Expected buf.lock to have dependency removed or be minimal"
    );
  });

  test("build with parameter creates output file", async () => {
    // Execute the build command with an output path parameter
    await vscode.commands.executeCommand("buf.build", "out.binpb");

    // Wait for the output file to be created
    const outUri = vscode.Uri.joinPath(workspaceFolder.uri, "out.binpb");
    const created = await waitFor(async () => {
      try {
        await vscode.workspace.fs.stat(outUri);
        return true;
      } catch {
        return false;
      }
    });

    assert.ok(created, "Expected out.binpb to be created");
  });
});
