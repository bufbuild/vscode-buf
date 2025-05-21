import { log } from "../log";
import { Command, CommandType } from "./command";

export const showOutput = new Command(
  "buf.showOutput",
  CommandType.COMMAND_EXTENSION,
  () => {
    return () => {
      log.show();
    };
  }
);
