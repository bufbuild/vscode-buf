import { Command } from "./command";
import { bufState } from "../state";

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
