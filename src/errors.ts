export interface Error {
  errorMessage: string;
}

export function isError(value: unknown): value is Error {
  return (value as Error).errorMessage !== undefined;
}
