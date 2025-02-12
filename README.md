# Buf for Visual Studio Code

## Installation

Install via the Visual Studio Code extension browser or see
[the extension page](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf)
for detailed installation instructions.

## Features

- Lints your protobuf files using `buf lint`. It checks your currently opened file
  whenever you save it.

  ![Lint errors](./lint_errors.png)

- Formats your protobuf files using `buf format`.

- Provides syntax highlighting for `.proto` files.

## Requirements

- [buf](https://docs.buf.build/installation)

## Extension Settings

This extension contributes the following settings:

- `buf.binaryPath`: configure the path to your buf binary. By default it uses `buf` in your `$PATH`.

## Changelog

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
