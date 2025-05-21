import * as vscode from "vscode";

import { Disposable, ExtensionContext } from "vscode";

export type ExtensionContextPlus = ExtensionContext &
  Pick<MockExtensionContext, "teardown">;

export class MockExtensionContext implements Partial<ExtensionContext> {
  subscriptions: Disposable[] = [];

  globalStorageUri?: vscode.Uri | undefined = vscode.Uri.file("/path/to/buf");

  static new(): ExtensionContextPlus {
    return new this() as unknown as ExtensionContextPlus;
  }

  teardown() {
    this.subscriptions.forEach((x) => x.dispose());
  }
}
