import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});
