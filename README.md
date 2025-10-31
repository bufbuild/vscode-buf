# Buf for Visual Studio Code

The [VS Code Buf extension][vs-code-marketplace] helps you work with [Protocol Buffers][protobuf]
files in a much more intuitive way, adding smart syntax highlighting, navigation, formatting,
documentation and diagnostic hovers, and integrations with [Buf][buf] commands.

## Features

- **Code navigation** - Go-to definition and documentation insets for `.proto` symbols.
- **Syntax highlighting** - Protobuf specific color and styling of code.
- **Code editing** - Formatting via `buf format` and annotations and hovers based on `buf lint`.
- **Documentation hovers** - Documentation for definitions when hovering a reference.
- **Buf command support** - Execution of `buf` CLI commands via the [Command Palette][command-palette].

![Preview features](./preview.gif)

## Getting Started

[Install the latest version via the VS Code marketplace][vs-code-marketplace].

By default, the extension will use your locally-installed version of `buf` on your system
`$PATH`. However, you don't have to install `buf` - the extension can manage and install it
for you based on the [buf.commandLine.path](#buf.commandline.path) and [buf.commandLine.version](#buf.commandline.version)
configurations:

| | <pre>buf.commandLine.path</pre> | <pre>buf.commandLine.version</pre> |
| --- | --- | --- |
| Default: Use `buf` from the system `$PATH`. | {empty} | {empty} |
| Use the latest released version of `buf` and check for updates on extension activation. | {empty} | `latest` |
| Use `buf` at specified path. | User specified path | {empty} |
| Install and use the specified version of `buf`. | {empty} | User specified semver version |
| Use `buf` at specified path and display an error message. | User specified path | User specified semver version |

## Extension Settings

This extension contributes the following configuration settings.

### buf.commandLine.path

Default: `null`
The path to a specific install of Buf to use. Relative paths are supported and are relative to the VS Code workspace root.

### buf.commandLine.version

Default: `null`
Specific version (e.g. 'v1.53.0') of Buf release to download and install.

### buf.restartAfterCrash

Default: `true`
Automatically restart the Buf Language Server (up to 4 times) if it crashes.

### buf.enableHover

Default: `true`
Enable hover features provided by the language server.

### buf.enable

Default: `true`
Enable Buf Language Server features.

### buf.debug

Default: `false`
Enable debug logs in output channels.

### buf.log-format

Default: `text`
Buf Language Server log format.

## Commands

This extension contributes the following commands to the [Command Palette][command-palette].

### Setup

- Install CLI: installs the `buf` CLI based on `buf.commandLine.path` and `buf.commandLine.version`
  configurations and then attempts to start the language server.
- Update CLI: updates the `buf` CLI based on `buf.commandLine.path` and `buf.commandLine.version`
  configurations and then attempts to start the language server.

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
