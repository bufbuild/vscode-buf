import * as vscode from "vscode";

export const showHelp = async (message: string, url: string) => {
  if (await vscode.window.showInformationMessage(message, "Open website")) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
};

export const slow = <T>(title: string, result: Promise<T>) => {
  const opts = {
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: false,
  };
  return Promise.resolve(vscode.window.withProgress(opts, () => result));
};

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
