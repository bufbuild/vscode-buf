import * as config from "../config";

import { Command, CommandType } from ".";
import { log } from "../log";
import { ServerStatus } from "../context";

export const stopBuf = new Command(
  "buf.stop",
  CommandType.COMMAND_EXTENSION,
  (_, bufCtx) => {
    return async () => {
      if (bufCtx.client) {
        log.info(
          `Request to stop language server (enabled: ${config.get<boolean>("enable")})`
        );
        await bufCtx.client.stop();
        bufCtx.client = undefined;
        bufCtx.status = ServerStatus.SERVER_STOPPED;
      }
    };
  }
);
