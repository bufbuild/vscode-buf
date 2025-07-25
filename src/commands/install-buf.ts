import { Command } from "./command";
import { bufState } from "../state";

/**
 * installBuf installs the Buf CLI binary and attempts to start the language server after.
 */
export const installBuf = new Command(
  "buf.install",
  "COMMAND_TYPE_SETUP",
  async (ctx) => {
    await bufState.installBufBinary(ctx.globalStorageUri.fsPath);
    await bufState.startLanguageServer(ctx);
  }
);
