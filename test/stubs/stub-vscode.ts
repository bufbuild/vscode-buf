import * as sinon from "sinon";
import * as vscode from "vscode";

export type StubVscode = {
  window: {
    showInformationMessage: sinon.SinonStub;
    showErrorMessage: sinon.SinonStub;
  };
};

export const createStubVscode = (sandbox: sinon.SinonSandbox): StubVscode => {
  return {
    window: {
      showInformationMessage: sandbox.stub(
        vscode.window,
        "showInformationMessage"
      ),
      showErrorMessage: sandbox.stub(vscode.window, "showErrorMessage"),
    },
  };
};
