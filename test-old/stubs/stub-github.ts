import * as github from "../../src/github";
import * as sinon from "sinon";

export type StubGithub = sinon.SinonStubStatic;

export const createStubGithub = (sandbox: sinon.SinonSandbox) => {
  return {
    getLatestRelease: sandbox.stub(github, "getRelease"),
    findAsset: sandbox.stub(github, "findAsset"),
  };
};
