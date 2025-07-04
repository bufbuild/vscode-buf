import * as config from "../../src/config";
import { test, expect } from "./base-test";

test("get keys", async ({ workbox }) => {
  const expectations: Record<string, string> = {
    "buf.commandLine": "path",
  };

  test.use({ extensionSettings: expectations });

  const path = config.get("commandLine");
  expect(path).toBe(expectations["buf.commandLine"]);
});
