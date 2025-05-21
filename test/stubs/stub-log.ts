import * as sinon from "sinon";
import { log } from "../../src/log";

export type StubLog = sinon.SinonStubbedInstance<typeof log>;

export const createStubLog = (sandbox: sinon.SinonSandbox): StubLog => {
  return sandbox.stub(log);
};
