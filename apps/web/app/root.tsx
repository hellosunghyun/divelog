import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import * as Sentry from "@sentry/react-router/cloudflare";

import type { Route } from "./+types/root";
import { MotionProvider } from "~/lib/motion/motion";
import { NavigationProgress } from "~/components/feedback/NavigationProgress";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "dns-prefetch", href: "https://ada-kr-pos.com" },
  { rel: "preconnect", href: "https://ada-kr-pos.com" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F6F8FB" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <Meta />
        <Links />
      </head>
      <body>

        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <MotionProvider>
      <NavigationProgress />
      <Outlet />
    </MotionProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const url = typeof window !== "undefined" ? window.location.href : "unknown";

  if (isRouteErrorResponse(error)) {
    Sentry.captureMessage(`RouteError ${error.status}: ${url}`, {
      level: error.status >= 500 ? "error" : "warning",
      tags: { type: "route_error", status: String(error.status) },
      extra: {
        url,
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      },
    });
  } else if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: { type: "render_error" },
      extra: { url },
    });
  }

  let message = "오류가 발생했습니다";
  let details = "예상치 못한 오류가 발생했습니다.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "오류";
    details =
      error.status === 404
        ? "요청하신 페이지를 찾을 수 없습니다."
        : error.statusText || "예상치 못한 오류가 발생했습니다.";
  } else if (error instanceof Error) {
    details = error.message;
    if (import.meta.env.DEV) {
      stack = error.stack;
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
