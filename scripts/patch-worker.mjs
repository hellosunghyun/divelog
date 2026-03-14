import { mkdirSync, writeFileSync } from "node:fs";

const createWorkerEntry = (serverBuildPath) => `
import { createRequestHandler } from "react-router";
import * as build from "${serverBuildPath}";

const requestHandler = createRequestHandler(build, "production");

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};
`;

mkdirSync("build/client", { recursive: true });

writeFileSync("build/worker.js", createWorkerEntry("./server/index.js"));
console.log("[patch-worker] wrote build/worker.js for Worker deployments");

writeFileSync("build/client/_worker.js", createWorkerEntry("../server/index.js"));
console.log("[patch-worker] wrote build/client/_worker.js for Cloudflare Pages");
