import { log } from "../log";
import { bufState } from "../state";
import { Command } from "./command";

/**
 * stopBuf stops the LSP server and client.
 */
export const stopBuf = new Command(
  "buf.stop",
  "COMMAND_TYPE_SERVER",
  async () => {
    if (bufState.client) {
      log.info(`Stopping Buf Language Server...`);
      await bufState.client.stop();
      bufState.languageServerStatus = "LANGUAGE_SERVER_STOPPED";
      return;
    }
  }
);
