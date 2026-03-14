import { execSync } from "node:child_process";

execSync(
  "npx esbuild build/server/index.js --bundle --format=esm --platform=neutral --conditions=workerd --outfile=build/client/_worker.js --external:node:* --external:cloudflare:*",
  { stdio: "inherit" }
);
console.log("[patch-worker] bundled build/client/_worker.js for Cloudflare Pages");
