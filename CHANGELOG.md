# Changelog

## Unreleased

- No changes yet.

## 0.8.1

- Upgrade packages and bump version for stable release.

## 0.8.0

This release reworks Buf for Visual Studio Code. It integrates the Buf Language Server,
available in [beta on the `buf` CLI][buf-lsp], introducing new [language server enabled features](README.md#features).

Thanks to [@christogav](https://github.com/christogav) for their contributions on integrating
the Buf Language Server with VS Code on this release.

## v0.7.2

- Fix issue with `buf` commands returning an unexpected error on exec.

## v0.7.1

- Fix "undefined" error when running `buf` on the extension.

## v0.7.0

- Output errors to "Buf" channel in the VS Code output console.

## v0.6.2

- Reintroduce relative binary path support.

## v0.6.1

- Revert relative binary path support.

## v0.6.0

- Support relative binary path.

## v0.5.3

- Add syntax highlighting for `.proto` files.

## v0.5.2

- Fix lint highlighting issue outside of the current file.

## v0.5.1

- Fix an issue with setting `buf format` as the default formatter for proto3 files.

## v0.5.0

- Add formatting using `buf format`. Defaults to format on save.

## v0.4.0

- Use single file reference to resolve lint file from any path

## v0.3.1

- Accept v1.0.0-rc1 in version parser

## v0.3.0

- Change `--version` to read from both `stdout` and `stderr`

## v0.2.0

- Update minimum required version to v0.34.0

## v0.1.3

- Update logo

## v0.1.0

- Add version check and download link

## v0.0.3

- Fix missing generation command

[buf-lsp]: https://buf.build/docs/reference/cli/buf/beta/lsp/)
