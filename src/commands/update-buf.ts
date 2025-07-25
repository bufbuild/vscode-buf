import { Command } from "./command";
import { bufState } from "../state";

/**
 * updateBuf updates the Buf CLI binary and attempts to start the language server after.
 */
export const updateBuf = new Command(
  "buf.update",
  "COMMAND_TYPE_SETUP",
  async (ctx) => {
    await bufState.updateBufBinary(ctx.globalStorageUri.fsPath);
    await bufState.startLanguageServer(ctx);
  }
);
