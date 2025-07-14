# VS Code Buf extension development guide

## Using VS Code debugger

To start a new instance of VS Code with the extension loaded and running, open this project,
`vscode-buf` in VS Code.

To run a new instance of VS Code with the extension loaded, navigate to "Run and Debug" in
the Activity Bar and select `Run Extension` or press F5.

To run extension tests, select `Run Extension Tests` from the dropdown in the "Run and Debug"
tab. This will run all tests in [test/integration](/test/integration) directory.

## Tests

### VS Code test CLI

There are two sets of tests run using the [VS Code test CLI][vscode-docs-test-cli]: unit tests and
integration tests.

The unit tests are simple tests that check isolated pieces of logic in the extension. They are run
against a single workspace, [test/workspaces/unit](/test/workspaces/unit).

The integration tests are used to test larger units of code that mutate the state of the extension,
such as managing the Buf CLI binary and activating the LSP server. The integration tests are run against
different workspaces to test the behavior with different workspace configurations.

### Playwright

We use Playwright to orchestrate end-to-end tests with user actions and conditions, e.g. running
commands from the Command Palette.

## Building the extension

To build the extension, run `make`. This produces a `*.vsix` file, which
can be manually installed to an instance of VS Code by running:

```sh
$ code --install-extension <name>.vsix
```

[vscode-docs-test-cli]: https://code.visualstudio.com/api/working-with-extensions/testing-extension#quick-setup-the-test-cli