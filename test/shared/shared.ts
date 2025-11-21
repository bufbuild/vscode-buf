import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

/**
 * The test asset download URL. We use a single test download URL for all assets so that
 * tests are consistent across platforms.
 */
const assetDownloadURL =
  "https://api.github.com/repos/bufbuild/buf/releases/assets/";
const downloadBinPath = "test/workspaces/empty-single/node_modules/@bufbuild/";
export const githubReleaseURL =
  "https://api.github.com/repos/bufbuild/buf/releases/";

/**
 * msw stub handlers for GitHub releases API.
 */
const handlers = [
  http.get(`${githubReleaseURL}latest`, () => {
    return HttpResponse.json({
      name: "v1.54.0",
      tag_name: "v1.54.0",
      assets: [
        {
          name: "buf-Darwin-arm64",
          url: `${assetDownloadURL}buf-darwin-arm64`,
        },
        {
          name: "buf-Darwin-x86_64",
          url: `${assetDownloadURL}buf-darwin-x64`,
        },
        {
          name: "buf-Linux-x86_64",
          url: `${assetDownloadURL}buf-linux-x64`,
        },
        {
          name: "buf-Linux-aarch64",
          url: `${assetDownloadURL}buf-linux-aarch64`,
        },
        {
          name: "buf-Windows-x86_64.exe",
          url: `${assetDownloadURL}buf-win32-x64`,
        },
        {
          name: "buf-Windows-arm64.exe",
          url: `${assetDownloadURL}buf-win32-arm64`,
        },
      ],
    });
  }),
  http.get(`${assetDownloadURL}:platformKey`, ({ params }) => {
    try {
      const bin = fs.readFileSync(
        os.platform() === "win32"
          ? path.resolve(
              __dirname,
              `../../../${downloadBinPath}${params.platformKey}/bin/buf.exe`
            )
          : `${downloadBinPath}${params.platformKey}/bin/buf`
      );
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bin);
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: {
          "content-type": "application/octet-stream",
        },
      });
    } catch (e) {
      return HttpResponse.json({ error: e }, { status: 404 });
    }
  }),
];

export const server = setupServer(...handlers);
