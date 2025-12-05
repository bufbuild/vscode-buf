import { server } from "../shared/shared";

async function globalSetup() {
  server.listen();
  return () => server.close();
}

export default globalSetup;
