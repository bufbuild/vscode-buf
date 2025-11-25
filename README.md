# Buf for Visual Studio Code

The [VS Code Buf extension][vs-code-marketplace] helps you work with [Protocol Buffers][protobuf]
files in a much more intuitive way, adding semantic syntax highlighting, navigation, formatting,
documentation and diagnostic hovers, and integrations with [Buf][buf] commands.

## Features

- Go to definition
- Go to references
- Auto-complete
- Contextual information on mouse hover
- Protobuf file formatting
- Syntax highlighting
- Workspace / Document symbols

![Preview features](./preview.gif)

## Getting Started

[Install the latest version via the VS Code marketplace][vs-code-marketplace].

You do not need to install the Buf CLI to use this extension. By default, the extension uses
the Buf CLI from your system `$PATH`. If `buf` isn't found on your `$PATH`, the extension
automatically downloads and installs the latest version to its own storage directory.

## Extension Settings

This extension contributes the following configuration setting.

### buf.debugLogs

Default: `false`
Enable debug logs in the Buf language server output channels.

## Commands

This extension contributes the following commands to the [Command Palette][command-palette].

### Language Server

- Start Buf Language Server: starts the Buf Language Server. If the Buf Language Server is
  already running, it will stop and then start it.
- Stop Buf Language Server: stops the Buf Language Server. If the Buf Language Server is not
  currently running, then it is a no-op.

### Buf

- Build: runs `buf build` with an optional user input for the build output.
- Init: runs `buf config init` at the root of each VS Code workspace. This creates a `buf.yaml` file
  to help users get started with Buf modules and workspaces.
- List available breaking change detection rules: lists the breaking change detection rules
  that are available.
- List available lint rules: lists the lint rules that are available.
- Prune module dependencies: prunes unused dependencies from the `buf.lock` at the root of
  each VS Code workspace.
- Update module dependencies: updates the dependencies in `buf.lock` at the root of each
  VS Code workspace.
- Generate: runs `buf generate` at the root of each VS Code workspace.
- List module files: lists the Protobuf definition files for the Buf module/workspace at the
  root of each VS Code workspace.
- Price of BSR paid plans: provides the pricing information for Buf Schema Registry (BSR)
  for each VS Code workspace.
- Module stats: provides Buf module/workspace stats at the root of each VS Code workspace.

### Extension

- Show Buf Output: shows the extension output channel

## Legal

Offered under the [Apache 2 license][license].

[command-palette]: https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette
[vs-code-marketplace]: https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf
[protobuf]: https://protobuf.dev/
[buf]: https://buf.build/
[license]: https://github.com/bufbuild/vscode-buf/blob/main/LICENSE
