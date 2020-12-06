export interface Error {
  errorMessage: string;
}

export function isError(value: any): value is Error {
  return (value as Error).errorMessage !== undefined;
}
