# Buf for Visual Studio Code

The [VS Code Buf extension](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf) provides rich support for [Protocol Buffers](https://protobuf.dev/) using the [Buf](https://buf.build/) development environment.

## Requirements

* Visual Studio Code
* A [Buf](https://buf.build/) configuration environment.

## Getting Started

The Buf CLI is the ultimate tool for modern, fast, and efficient Protobuf API management. Getting started is simple!

1. Install the [VS Code Buf extension](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf).
2. Create a [buf.yaml](https://buf.build/docs/cli/#default-configuration) in the root of your workspace.
3. Open any Protobuf file to automatically activate the extension. A Buf status bar appears in the bottom right corner of the window.
4. The extension depends on the [Buf CLI](https://buf.build/docs/cli/). If a Buf binary is not found in your path, the extension will attempt to install the latest release from Github.

## Features

- **Code navigation** - Jump to or peek at a symbol's declaration.
- **Syntax highlighting** - Protobuf specific color and styling of code.
- **Code editing** - Support for formatting and linting.
- **Buf command support** - Execution of Buf CLI commands e.g. [Buf Generate](https://buf.build/docs/generate/tutorial/).

## Extension Settings

This extension contributes the following settings:

### buf.commandLine.path

Default: `null`

The path to a specific install of Buf to use. Relative paths are supported and are relative to the workspace root.

> If not set and `buf.commandLine.version` is also not set, the extension will attempt to find a os-specific Buf binary on the path.

### buf.commandLine.version

Default: `null`

Specific version (git tag e.g. 'v1.53.0') of Buf release to download and install.

### buf.restartAfterCrash

Default: `true`

Automatically restart Buf (up to 4 times) if it crashes.

### buf.checkUpdates

Default: `true`

Check for language server updates on startup.

### buf.enableHover

Default: `true`

Enable hover features provided by the language server.

### buf.enable

Default: `true`

Enable Buf language server features.

### buf.debug

Default: `false`

Enable debug mode.

### buf.log-format

Default: `text`

Buf language server log format.

### buf.checks.breaking.againstStrategy

Default: `git`

The strategy to use when checking breaking changes against a specific reference.

### buf.checks.breaking.againstGitRef

Default: `refs/remotes/origin/HEAD`

The Git reference to check breaking changes against.

## Changelog

- v0.8.0
  - Improve overall editor functionality, using Buf Language Server.
- v0.7.2
  - Fix issue with `buf` commands returning an unexpected error on exec.
- v0.7.1
  - Fix "undefined" error when running `buf` on the extension.
- v0.7.0
  - Output errors to "Buf" channel in the VSCode output console.
- v0.6.2
  - Reintroduce relative binary path support.
- v0.6.1
  - Revert relative binary path support.
- v0.6.0
  - Support relative binary path.
- v0.5.3
  - Add syntax highlighting for `.proto` files.
- v0.5.2
  - Fix lint highlighting issue outside of the current file.
- v0.5.1
  - Fix an issue with setting buf format as the default formatter for proto3 files.
- v0.5.0
  - Add formatting through using buf format. Defaults to format on save.
- v0.4.0
  - Use single file reference to resolve lint file from any path
- v0.3.1
  - Accept v1.0.0-rc1 in version parser
- v0.3.0
  - Change `--version` to read from both `stdout` and `stderr`
- v0.2.0
  - Update minimum required version to v0.34.0
- v0.1.3
  - Update logo
- v0.1.0
  - Add version check and download link
- v0.0.3
  - Fix missing generation command
