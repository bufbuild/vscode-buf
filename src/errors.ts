export const unwrapError = (err: unknown) => {
  return err instanceof Error ? err.message : String(err);
};
