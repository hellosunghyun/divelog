import * as Sentry from "@sentry/react-router/cloudflare";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

Sentry.init({
  dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
  sendDefaultPii: true,

  integrations: [
    Sentry.reactRouterTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: 1.0,
  tracePropagationTargets: [/^\//, /^https:\/\/divelog\.ada-kr-pos\.com/],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
