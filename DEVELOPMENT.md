## Running locally

Open the directory in VS Code and run by pressing F5. This will start a new instance of VS code with the plugin loaded.

## Running tests

Open the debug tab, switch from `Run Extension` to `Run Extension Tests`.
Press F5 to run the tests.

## Building the extension

To build the extension, run `make`. This produces a `*.vsix` file, which
can be manually installed to an instance of VSCode by running:

```sh
$ code --install-extension <name>.vsix
```
