import type { Route } from "./+types/api.images.$";

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = params["*"];

  if (!key) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await context.cloudflare.env.R2.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.etag);

  return new Response(object.body, { headers });
}
