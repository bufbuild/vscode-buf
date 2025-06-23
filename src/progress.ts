import * as vscode from "vscode";

/**
 * @file Provides a progress tracker for processes that expose progress to the user.
 */

/**
 * A progress tracker that takes a specified name, {@link AbortController}, and async callback.
 */
export const progress = <T>(
  title: string,
  cancel: AbortController | null,
  body: (progress: (fraction: number) => void) => Promise<T>
) => {
  const opts = {
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: cancel !== null,
  };
  const result = vscode.window.withProgress(opts, async (progress, canc) => {
    if (cancel) {
      canc.onCancellationRequested((_) => cancel.abort());
    }
    let lastFraction = 0;
    return body((fraction) => {
      if (fraction > lastFraction) {
        progress.report({ increment: 100 * (fraction - lastFraction) });
        lastFraction = fraction;
      }
    });
  });
  return Promise.resolve(result); // Thenable to real promise.
};
