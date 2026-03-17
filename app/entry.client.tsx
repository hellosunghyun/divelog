import * as Sentry from "@sentry/react-router/cloudflare";
import { startTransition } from "react";
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

// 배포 후 구 청크 로딩 실패 시 자동 새로고침 (1회만)
window.addEventListener("error", (event) => {
  const msg = event.message ?? "";
  if (
    (msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module")) &&
    !sessionStorage.getItem("chunk_reload")
  ) {
    sessionStorage.setItem("chunk_reload", "1");
    window.location.reload();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message ?? event.reason ?? "");
  if (
    (msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module")) &&
    !sessionStorage.getItem("chunk_reload")
  ) {
    sessionStorage.setItem("chunk_reload", "1");
    window.location.reload();
  }
});

// 정상 로드 시 플래그 초기화
window.addEventListener("load", () => {
  sessionStorage.removeItem("chunk_reload");
});

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />, {
    onRecoverableError(error) {
      Sentry.captureException(error, { tags: { type: "hydration" } });
    },
  });
});
