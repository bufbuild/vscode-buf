import assert from "node:assert";
import * as vscode from "vscode";
import {
  fileExists,
  readFileContents,
  sleep,
  waitForDirectory,
  waitForFile,
} from "./test-helpers";

suite("buf commands", () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  setup(async () => {
    // Ensure extension is activated
    await vscode.extensions.getExtension("bufbuild.vscode-buf")?.activate();

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, "Expected a workspace folder");
    workspaceFolder = folders[0];
  });

  suite("buf.build", () => {
    test("build command with user input creates output file", async function () {
      // Increase timeout as build operations can take time
      this.timeout(30000);

      const outPath = "out.binpb";
      const outFileUri = vscode.Uri.joinPath(workspaceFolder.uri, outPath);

      // Clean up any existing output file first
      if (await fileExists(outFileUri)) {
        await vscode.workspace.fs.delete(outFileUri);
      }

      // Stub the input box to return our desired output path
      const originalShowInputBox = vscode.window.showInputBox;
      let inputBoxCalled = false;
      vscode.window.showInputBox = async () => {
        inputBoxCalled = true;
        return outPath;
      };

      try {
        // Execute the build command
        await vscode.commands.executeCommand("buf.build");

        // Verify input box was called
        assert.ok(inputBoxCalled, "Expected input box to be shown");

        // Wait for the output file to be created
        await waitForFile(outFileUri, 15000);

        // Verify the file exists
        const exists = await fileExists(outFileUri);
        assert.ok(exists, `Expected output file ${outPath} to be created`);
      } finally {
        // Restore original showInputBox
        vscode.window.showInputBox = originalShowInputBox;

        // Clean up
        if (await fileExists(outFileUri)) {
          await vscode.workspace.fs.delete(outFileUri);
        }
      }
    });

    test("build command without user input runs to /dev/null", async function () {
      this.timeout(30000);

      // Stub the input box to return undefined (user cancellation)
      const originalShowInputBox = vscode.window.showInputBox;
      let inputBoxCalled = false;
      vscode.window.showInputBox = async () => {
        inputBoxCalled = true;
        return undefined;
      };

      try {
        // Execute the build command
        await vscode.commands.executeCommand("buf.build");

        // Verify input box was called
        assert.ok(inputBoxCalled, "Expected input box to be shown");

        // Give it time to run
        await sleep(5000);

        // Command should complete without error even with undefined input
        // No file to check in this case as it outputs to /dev/null
      } finally {
        // Restore original showInputBox
        vscode.window.showInputBox = originalShowInputBox;
      }
    });
  });

  suite("buf.configinit", () => {
    test("init creates buf.yaml file", async function () {
      this.timeout(30000);

      const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");

      // Check if buf.yaml already exists and delete it for the test
      const alreadyExists = await fileExists(bufYamlUri);
      if (alreadyExists) {
        await vscode.workspace.fs.delete(bufYamlUri);
      }

      try {
        // Execute the init command
        await vscode.commands.executeCommand("buf.configinit");

        // Wait for buf.yaml to be created
        await waitForFile(bufYamlUri, 15000);

        // Read and verify the content
        const content = await readFileContents(bufYamlUri);
        assert.ok(
          content.includes("version:"),
          "Expected buf.yaml to contain version field"
        );
      } finally {
        // Restore the original buf.yaml if it existed
        if (alreadyExists) {
          const encoder = new TextEncoder();
          await vscode.workspace.fs.writeFile(
            bufYamlUri,
            encoder.encode("version: v1\n")
          );
        }
      }
    });
  });

  suite("buf.generate", () => {
    test("generate command creates output directory", async function () {
      // This test requires a buf.gen.yaml file to be present
      this.timeout(60000);

      const genDirUri = vscode.Uri.joinPath(workspaceFolder.uri, "gen-es");
      const bufGenYamlUri = vscode.Uri.joinPath(
        workspaceFolder.uri,
        "buf.gen.yaml"
      );

      // Clean up any existing gen directory
      if (await fileExists(genDirUri)) {
        await vscode.workspace.fs.delete(genDirUri, { recursive: true });
      }

      // Create a buf.gen.yaml for testing
      const bufGenYaml = `version: v2
managed:
  enabled: true

plugins:
  - remote: buf.build/bufbuild/es:v2.2.2
    out: gen-es
    opt: target=ts

inputs:
  - module: buf.build/bufbuild/registry
`;
      const encoder = new TextEncoder();
      const needsCleanup = !(await fileExists(bufGenYamlUri));
      await vscode.workspace.fs.writeFile(
        bufGenYamlUri,
        encoder.encode(bufGenYaml)
      );

      try {
        // Execute the generate command
        await vscode.commands.executeCommand("buf.generate");

        // Wait for the output directory to be created
        await waitForDirectory(genDirUri, 30000);

        // Verify the directory exists
        const exists = await fileExists(genDirUri);
        assert.ok(exists, "Expected gen-es directory to be created");
      } finally {
        // Clean up
        if (await fileExists(genDirUri)) {
          await vscode.workspace.fs.delete(genDirUri, { recursive: true });
        }
        if (needsCleanup && (await fileExists(bufGenYamlUri))) {
          await vscode.workspace.fs.delete(bufGenYamlUri);
        }
      }
    });
  });

  suite("buf.depupdate", () => {
    test("dep update creates buf.lock file with dependencies", async function () {
      this.timeout(60000);

      const bufLockUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.lock");
      const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");

      // Save original buf.yaml content
      const originalBufYaml = await readFileContents(bufYamlUri);

      // Create buf.yaml with dependencies
      const bufYamlWithDeps = `version: v2
deps:
  - buf.build/googleapis/googleapis
`;
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(
        bufYamlUri,
        encoder.encode(bufYamlWithDeps)
      );

      // Clean up any existing buf.lock
      if (await fileExists(bufLockUri)) {
        await vscode.workspace.fs.delete(bufLockUri);
      }

      try {
        // Execute the dep update command
        await vscode.commands.executeCommand("buf.depupdate");

        // Wait for buf.lock to be created
        await waitForFile(bufLockUri, 30000);

        // Read and verify the content
        const lockContent = await readFileContents(bufLockUri);
        assert.ok(
          lockContent.includes("buf.build/googleapis/googleapis"),
          "Expected buf.lock to contain googleapis dependency"
        );
      } finally {
        // Restore original buf.yaml
        await vscode.workspace.fs.writeFile(
          bufYamlUri,
          encoder.encode(originalBufYaml)
        );

        // Clean up buf.lock
        if (await fileExists(bufLockUri)) {
          await vscode.workspace.fs.delete(bufLockUri);
        }
      }
    });
  });

  suite("buf.depprune", () => {
    test("dep prune removes unused dependencies from buf.lock", async function () {
      this.timeout(60000);

      const bufLockUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.lock");
      const bufYamlUri = vscode.Uri.joinPath(workspaceFolder.uri, "buf.yaml");

      // Save original buf.yaml content
      const originalBufYaml = await readFileContents(bufYamlUri);

      // First, create buf.yaml with dependencies and update to create buf.lock
      const bufYamlWithDeps = `version: v2
deps:
  - buf.build/googleapis/googleapis
`;
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(
        bufYamlUri,
        encoder.encode(bufYamlWithDeps)
      );

      // Clean up any existing buf.lock
      if (await fileExists(bufLockUri)) {
        await vscode.workspace.fs.delete(bufLockUri);
      }

      try {
        // Update dependencies to create buf.lock
        await vscode.commands.executeCommand("buf.depupdate");
        await waitForFile(bufLockUri, 30000);

        // Verify buf.lock has the dependency
        let lockContent = await readFileContents(bufLockUri);
        assert.ok(
          lockContent.includes("buf.build/googleapis/googleapis"),
          "Expected buf.lock to contain googleapis dependency before prune"
        );

        // Now remove the dependency from buf.yaml (making it unused)
        const bufYamlNoDeps = "version: v2\n";
        await vscode.workspace.fs.writeFile(
          bufYamlUri,
          encoder.encode(bufYamlNoDeps)
        );

        // Execute the dep prune command
        await vscode.commands.executeCommand("buf.depprune");

        // Give it time to prune
        await sleep(5000);

        // Read buf.lock and verify the dependency was removed
        lockContent = await readFileContents(bufLockUri);
        assert.ok(
          !lockContent.includes("buf.build/googleapis/googleapis") ||
            lockContent.trim() === "",
          "Expected unused dependency to be pruned from buf.lock"
        );
      } finally {
        // Restore original buf.yaml
        await vscode.workspace.fs.writeFile(
          bufYamlUri,
          encoder.encode(originalBufYaml)
        );

        // Clean up buf.lock
        if (await fileExists(bufLockUri)) {
          await vscode.workspace.fs.delete(bufLockUri);
        }
      }
    });
  });

  suite("buf.showOutput", () => {
    test("show output command displays output channel", async function () {
      this.timeout(10000);

      // Execute the show output command
      await vscode.commands.executeCommand("buf.showOutput");

      // Give it time to show
      await sleep(1000);

      // Unfortunately, there's no direct VS Code API to verify which output channel
      // is currently shown. We can only verify the command executes without error.
      // The actual visibility would need to be tested manually or through UI automation.

      // If we got here without throwing, the command executed successfully
      assert.ok(true, "Show output command executed successfully");
    });
  });
});
