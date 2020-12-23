# Buf for Visual Studio Code

## Features

Currently only supports linting but expect new features to be added soon!

### Linting

Supports linting your protobuf files using `buf check lint`. It checks your currently opened file
whenever you save it.

![Lint errors](https://github.com/bufbuild/vscode-buf/blob/master/lint_errors.png)

## Requirements

- [buf](https://docs.buf.build/installation)

## Extension Settings

This extension contributes the following settings:

- `buf.binaryPath`: configure the path to your buf binary. By default it uses `buf` in your `$PATH`.
