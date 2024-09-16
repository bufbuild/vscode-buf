/**
 * An error value.
 */
export class Error {
  /** The message associated with this error. */
  readonly message: string

  constructor(message: string) {
    this.message = message
  }
}

/** A result that might not succeed. */
export type Result<T> = T | Error;