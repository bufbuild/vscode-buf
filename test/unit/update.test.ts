import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node';
import { after, afterEach, before } from "mocha";
import { Release } from '../../src/github';
import { updateBuf } from '../../src/commands/update-buf';

const handlers = [
  http.get('https://api.github.com/repos/bufbuild/buf/releases', () => {
    return HttpResponse.json({
      name: 'buf 1.53.0',
      tag_name: 'v1.53.0',
      assets: [
        {
          name: 'buf-1.53.0-darwin-amd64',
          browser_download_url: 'https://github.com/bufbuild/buf/releases/download/v1.53.0/buf-1.53.0-darwin-amd64'
        }
      ]
    } satisfies Release)
  }),
  http.get('https://github.com/bufbuild/buf/releases/download/v1.53.0/buf-1.53.0-darwin-amd64', () => {
    // TODO: Load a binary from disk instead. Basicall just read and respond via HttpResponse.arrayBuffer
    return HttpResponse.text("This is a fake buf binary");
  })
];

const server = setupServer(...handlers);

before(() => server.listen())
afterEach(() => server.resetHandlers())
after(() => server.close())


suite("update", () => {
    test("update to latest version", () => {
        updateBuf.execute();
    })
})