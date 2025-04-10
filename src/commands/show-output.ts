import { Command, CommandType } from ".";
import { log } from "../log";

export const showOutput = new Command(
  "buf.showOutput",
  CommandType.COMMAND_EXTENSION,
  () => {
    return () => {
      log.show();
    };
  }
);
