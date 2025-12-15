# Buf for Visual Studio Code

The [VS Code Buf extension][vs-code-marketplace] helps you work with [Protocol Buffers][protobuf]
files in a much more intuitive way, adding semantic syntax highlighting, navigation, formatting,
documentation and diagnostic hovers, and integrations with [Buf][buf] commands.

## Features

- Code navigation: Jump to a symbol's declaration and check references to a symbol.
- Autocompletion: Get code completion for symbols as you code through [IntelliSense][intellisense].
- Syntax highlighting: 
- Documentation hovers: Peek at a symbol's documentation




Go-to definition and go-to references for `.proto` symbols.
- Autocompletion: Completion results for `.proto` symbols using [IntelliSense][intellisense].
- Syntax highlighting: Protobuf specific color and styling for code.
- Documentation hovers: Documentation for definitions when hovering a reference.
- Formatting: Formats `.proto` files on-save.
- Diagnostics: Annotations and highlights for build and lint errors.

![Preview features](./preview.gif)

In addition to integrated editing features, the extension provides commands through the
`buf` CLI. These commands are accessible by opening the [Command Palette][command-palette],
`Ctrl/Cmd+Shift+P`. See the [full list of commands](#commands) provided by this extension.

## Requirements

- Visual Studio Code 1.95 or newer (or editors compatible with VS Code 1.90+ APIs)

## Getting Started

[Install the latest version via the VS Code marketplace][vs-code-marketplace].

You do not need to install the Buf CLI to use this extension. By default, the extension uses
the Buf CLI from your system `$PATH`. If `buf` isn't found on your `$PATH`, the extension
automatically downloads and installs the latest version to its own storage directory.

## Community and Support

Feedback is welcome and appreciated! For feature requests, bugs, or questions, please
[file an issue][issue].

If you're looking for help and/or discussion around Protobuf, best practices, etc., join us
on [Slack][slack].

## Commands

A full list of [Command Palette][command-palette] commands provided by this extension:

- Start Buf Language Server: starts the Buf Language Server. If the Buf Language Server is
  already running, it will stop and then start it.

- Stop Buf Language Server: stops the Buf Language Server. If the Buf Language Server is not
  currently running, then it is a no-op.

- Build: runs `buf build` with optional user input for the build output file. If the build
  output is specified by the user, it will be created at the root of each VS Code workspace.

- Init: runs `buf config init` at the root of each VS Code workspace. This creates a `buf.yaml` file
  to help users get started with Buf modules and workspaces.

- List available breaking change detection rules: runs `buf config ls-breaking-rules` at the
  root of each VS Code workspace and provides a list of available [breaking change detection rules][breaking-rules]
  in a VS Code editor window.

- List available lint rules: runs `buf config ls-lint-rules` at the root of each VS Code workspace
  and provides a list of available [lint rules][lint-rules] in a VS Code editor window.

- Prune module dependencies: runs `buf dep prune` at the root of each VS Code workspace and
  prunes unused dependencies from the `buf.lock` file(s).

- Update module dependencies: runs `buf dep update` at the root of each VS Code workspace and
  updates the dependencies in the `buf.lock` file(s).

- Generate: runs `buf generate` at the root of each VS Code workspace and generates code based
  on the `buf.gen.yaml` file(s).

- Show Buf Output: shows the extension output channel.

## Legal

Offered under the [Apache 2 license][license].

[buf]: https://buf.build/
[breaking-rules]: https://buf.build/docs/breaking/rules
[command-palette]: https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette
[issue]: https://github.com/bufbuild/vscode-buf/issues/new/choose
[intellisense]: https://code.visualstudio.com/docs/editing/intellisense
[license]: https://github.com/bufbuild/vscode-buf/blob/main/LICENSE
[lint-rules]: https://buf.build/docs/lint/rules
[protobuf]: https://protobuf.dev/
[slack]: https://buf.build/links/slack
[vs-code-marketplace]: https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf
