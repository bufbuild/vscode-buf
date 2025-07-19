import { bufState } from "../state";
import { Command } from "./command";

/**
 * stopLanguageServer stops the language server and client.
 */
export const stopLanguageServer = new Command(
  "buf.stopLanguageServer",
  "COMMAND_TYPE_SERVER",
  async () => {
    await bufState.stopLanguageServer();
  }
);
