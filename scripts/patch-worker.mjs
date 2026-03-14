import { build } from "esbuild";

await build({
  entryPoints: ["build/server/index.js"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  conditions: ["workerd"],
  outfile: "build/client/_worker.js",
  external: ["node:*", "cloudflare:*"],
  logLevel: "info",
});
console.log("[patch-worker] bundled build/client/_worker.js for Cloudflare Pages");
