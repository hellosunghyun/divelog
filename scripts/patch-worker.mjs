import { appendFileSync } from "node:fs";

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
