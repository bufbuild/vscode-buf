# Releasing vscode-buf

This document outlines how to create a release of vscode-buf.

The VS Code extension is published to both [Microsoft’s Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf) and [Open VSX](https://open-vsx.org/extension/bufbuild/vscode-buf).

1. Make sure all dependencies are upgraded, and that CI on `main` is green.

2. Ensure the [CHANGELOG](./CHANGELOG.md) reflects the state of the world;
   look through the commits between now and the latest release to ensure all user-facing changes are reflected.

3. Using the GitHub UI, create a new release.
   - Under “Choose a tag”, type in “X.Y.Z” to create a new tag for the release upon publish.
     - _Important_: Do not include a "v" prefix on the version.
     - _Important_: VS Code Marketplace requires a non-prerelease semver version (e.g., `1.0.0-rc1` is disallowed).
       Use a non-prerelease semver version even if you plan to tick the "set as a pre-release" box.
   - Target the main branch.
   - Title the Release “X.Y.Z”.
   - Click “set as latest release”.
   - Set the last version as the “Previous tag”.
   - Copy in the release notes from the CHANGELOG.md "Unreleased" section.
     - If any edits need to be made, you can save the release as a draft, make a PR to edit the CHANGELOG, and then copy in the new changes.

4. Publish the release.
   The ["Publish Extension" workflow](./.github/workflows/publish.yaml) will take care of updating the CHANGELOG and package.json to the given version.
