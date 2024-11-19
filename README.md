# Buf for Visual Studio Code

## Installation

[Install the latest version via the VSCode marketplace.](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf)

To install manually (or to install an unreleased version), clone this
repository, run `make`, and then install the resulting `vscode-buf-<version>.vsix`
with

```console
$ code --install-extension `vscode-buf-<version>.vsix`
```

## Features

- Syntax highlighting for `.proto` files, including semantic highlighting.

- Linting via `buf lint` and `buf breaking`.

- Formatting via `buf format`.

- Go to definition and documentation insets for `.proto` symbols.

## Requirements

You do not need to have `buf` installed; the extension will install it for
you automatically. You must, however, be on a platform that Buf ships releases
for, which can be found at https://github.com/bufbuild/buf/releases.

You can also have the extension use a locally-installed version of the `buf`
tool, instead.
