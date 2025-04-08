import { Command, CommandType } from ".";
import { log } from "../util";

export const showOutput = new Command(
  "buf.showOutput",
  CommandType.COMMAND_EXTENSION,
  () => {
    return () => {
      log.show();
    };
  }
);
