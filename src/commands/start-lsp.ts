import { bufState } from "../state";
import { Command } from "./command";

/**
 * startLanguageServer starts the language server and client.
 */
export const startLanguageServer = new Command(
  "buf.startLanguageServer",
  "COMMAND_TYPE_SERVER",
  async (ctx) => {
    await bufState.startLanguageServer(ctx);
  }
);
