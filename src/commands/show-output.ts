import { log } from "../log";
import { Command } from "./command";

/**
 * showOutput shows the extension log output channel. The Buf extension output channel will
 * take focus.
 */
export const showOutput = new Command(
  "buf.showOutput",
  "COMMAND_TYPE_EXTENSION",
  async () => {
    log.show();
  }
);
