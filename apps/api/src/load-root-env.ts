import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rootEnvPath = path.join(repoRoot, ".env");

if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath, override: false, quiet: true });
}
