import type { Route } from "./+types/images.$";
import { createLogger } from "~/lib/logger.server";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "api.images" });
  logger.info("loader_start");

  const key = params["*"];

  if (!key) {
    logger.info("image_not_found", { key });
    return new Response("Not Found", { status: 404 });
  }

  const startTime = Date.now();
  const object = await context.cloudflare.env.R2.get(key);

  if (!object) {
    logger.info("image_not_found", { key });
    return new Response("Not Found", { status: 404 });
  }

  const durationMs = Date.now() - startTime;
  logger.info("image_served", { key, durationMs });

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.etag);

  return new Response(object.body, { headers });
}
