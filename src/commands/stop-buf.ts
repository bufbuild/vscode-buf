import * as config from "../config";

import { ServerStatus } from "../context";
import { log } from "../log";
import { Command, CommandType } from "./command";

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
