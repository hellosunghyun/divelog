import { createRequestHandler } from "react-router";
import { wrapRequestHandler } from "@sentry/cloudflare";
import { createLogger } from "../app/lib/infra/logger.server";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

function withHtmlCacheHeaders(response: Response, request: Request) {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  const isAuthenticated =
    request.headers.get("cookie")?.includes("adakrpos_session") ?? false;
  const headers = new Headers(response.headers);
  const existingVary = headers.get("Vary");

  headers.set(
    "Vary",
    existingVary ? `${existingVary}, Cookie` : "Cookie",
  );
  headers.set(
    "Cache-Control",
    isAuthenticated
      ? "private, no-cache"
      : "public, s-maxage=60, stale-while-revalidate=300",
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const logger = createLogger(request, env as { LOG_LEVEL?: string });
    const url = new URL(request.url);
    const startMs = Date.now();

    logger.info("request_start", {
      method: request.method,
      path: url.pathname,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    try {
      const response = await wrapRequestHandler(
        {
          options: {
            dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
            tracesSampleRate: 0.1,
            sendDefaultPii: true,
          },
          request,
          context: ctx,
        },
        () =>
          requestHandler(request, {
            cloudflare: { env, ctx },
          }),
      );
      logger.info("request_end", {
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - startMs,
      });
      return withHtmlCacheHeaders(response, request);
    } catch (thrown: unknown) {
      if (thrown instanceof Response) {
        logger.info("request_response_throw", {
          method: request.method,
          path: url.pathname,
          status: thrown.status,
          durationMs: Date.now() - startMs,
        });
        return thrown;
      }
      if (thrown instanceof Error) {
        logger.error("request_error", {
          method: request.method,
          path: url.pathname,
          error: thrown.message,
          stack: thrown.stack,
          durationMs: Date.now() - startMs,
        });
        throw thrown;
      }
      logger.error("request_unknown_error", {
        method: request.method,
        path: url.pathname,
        value: String(thrown),
        durationMs: Date.now() - startMs,
      });
      throw thrown;
    }
  },
} satisfies ExportedHandler<Env>;
