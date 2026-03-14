import { appendFileSync, copyFileSync } from "node:fs";

const workerEntry = `
import { createRequestHandler } from "react-router";
const requestHandler = createRequestHandler(
  () => ({ assets: serverManifest, entry, routes, basename, future, isSpaMode, publicPath, ssr, prerender, routeDiscovery }),
  "production"
);
export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};
`;

appendFileSync("build/server/index.js", workerEntry);
console.log("[patch-worker] default export appended to build/server/index.js");

copyFileSync("build/server/index.js", "build/client/_worker.js");
console.log("[patch-worker] copied to build/client/_worker.js for Cloudflare Pages");
