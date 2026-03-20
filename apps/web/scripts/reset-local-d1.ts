import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const d1StateDir = resolve(scriptDir, "../../../.wrangler/state/v3/d1");

if (!existsSync(d1StateDir)) {
  console.log(`[reset-local-d1] no local D1 state at ${d1StateDir}`);
  process.exit(0);
}

await rm(d1StateDir, { recursive: true, force: true });
console.log(`[reset-local-d1] removed ${d1StateDir}`);
