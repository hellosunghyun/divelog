import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import * as Sentry from "@sentry/react-router/cloudflare";
import { safeInjectTraceMetaTags } from "~/lib/infra/safe-inject-sentry-meta";

async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext
) {
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) {
          console.error(error);
        }
      },
    }
  );
  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await stream.allReady;
  }

  const body = safeInjectTraceMetaTags(stream);

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

export const handleError = (
  error: unknown,
  { request }: { request: Request },
) => {
  if (request.signal.aborted) return;
  const url = new URL(request.url);
  Sentry.captureException(error, {
    contexts: {
      request: {
        method: request.method,
        url: url.pathname + url.search,
      },
    },
  });
};

export default Sentry.wrapSentryHandleRequest(handleRequest);
