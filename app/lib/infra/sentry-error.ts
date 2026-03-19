import * as Sentry from "@sentry/react-router/cloudflare";

type CaptureRouteErrorOptions = {
  route: string;
  url?: string;
  extra?: Record<string, unknown>;
};

const capturedErrors = new WeakSet<Error>();
const capturedRouteResponses = new Set<string>();

type RouteLikeError = {
  status: number;
  statusText?: string;
  data?: unknown;
};

function getRouteLikeError(value: unknown): RouteLikeError | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  if (!("status" in value)) {
    return null;
  }

  const status = (value as { status: unknown }).status;
  if (typeof status !== "number") {
    return null;
  }

  const statusText = "statusText" in value && typeof (value as { statusText: unknown }).statusText === "string"
    ? (value as { statusText: string }).statusText
    : undefined;
  const data = "data" in value ? (value as { data?: unknown }).data : undefined;

  return { status, statusText, data };
}

function trimCapturedRoutes() {
  if (capturedRouteResponses.size > 500) {
    capturedRouteResponses.clear();
  }
}

export function captureRouteBoundaryError(error: unknown, options: CaptureRouteErrorOptions) {
  const url = options.url ?? (typeof window !== "undefined" ? window.location.href : "unknown");
  const routeError = getRouteLikeError(error);

  if (routeError) {
    const signature = `${options.route}:${routeError.status}:${url}`;
    if (capturedRouteResponses.has(signature)) {
      return;
    }

    capturedRouteResponses.add(signature);
    trimCapturedRoutes();

    Sentry.captureMessage(`RouteError ${routeError.status}: ${url}`, {
      level: routeError.status >= 500 ? "error" : "warning",
      tags: {
        type: "route_error",
        route: options.route,
        status: String(routeError.status),
      },
      extra: {
        url,
        status: routeError.status,
        statusText: routeError.statusText,
        data: routeError.data,
        ...options.extra,
      },
    });

    return;
  }

  if (error instanceof Error) {
    if (capturedErrors.has(error)) {
      return;
    }

    capturedErrors.add(error);
    Sentry.captureException(error, {
      tags: {
        type: "render_error",
        route: options.route,
      },
      extra: {
        url,
        ...options.extra,
      },
    });

    return;
  }

  const signature = `${options.route}:unknown:${url}:${String(error)}`;
  if (capturedRouteResponses.has(signature)) {
    return;
  }

  capturedRouteResponses.add(signature);
  trimCapturedRoutes();
  Sentry.captureMessage(`UnknownRouteBoundaryError: ${options.route}`, {
    level: "error",
    tags: {
      type: "unknown_route_error",
      route: options.route,
    },
    extra: {
      url,
      value: String(error),
      ...options.extra,
    },
  });
}
