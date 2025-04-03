import { Error } from "./errors";

// Lines and columns are 1-indexed
export interface Warning {
  path: string;
  type: string;
  start_line: number;
  end_line: number;
  start_column: number;
  end_column: number;
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- is type assertion so we need to allow any on incoming.
function isWarning(o: any): o is Warning {
  return (
    "path" in o &&
    "type" in o &&
    "start_line" in o &&
    "end_line" in o &&
    "start_column" in o &&
    "end_column" in o &&
    "message" in o
  );
}

export const parseLines = (errorLines: string[]): Warning[] | Error => {
  const warnings: Warning[] = [];
  for (let index = 0; index < errorLines.length; index++) {
    try {
      const warning = JSON.parse(errorLines[index]);
      if (isWarning(warning)) {
        warnings.push(warning);
      }
    } catch (_error: unknown) {
      return {
        errorMessage: `${errorLines.join(",")}`,
      };
    }
  }
  return warnings;
};
