import * as vscode from 'vscode';

import { Error, Result } from './error';

import { AbortController } from 'abort-controller';

export function slow<T>(title: string, result: Promise<T>) {
  const opts = {
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: false,
  };
  return Promise.resolve(vscode.window.withProgress(opts, () => result));
}

export async function progress<T>(
  title: string,
  abort: AbortController | undefined,
  body: (progress: (fraction: number) => void) => Promise<T>,
): Promise<Result<T>> {
  let opts = {
    location: vscode.ProgressLocation.Notification,
    title: title,
    cancellable: abort !== undefined,
  };

  try {
    let result = await Promise.resolve(vscode.window.withProgress(opts, async (progress, cancel) => {
      if (abort !== undefined) {
        cancel.onCancellationRequested((_) => abort.abort());
      }

      let cur = 0;
      return body(fraction => {
        if (fraction <= cur) {
          return;
        }
        
        progress.report({
          increment: 100 * (fraction - cur),
        });
        cur = fraction;
      });
    }));

    return result;
  } catch (e) {
    return new Error(`${e}`);
  }
}