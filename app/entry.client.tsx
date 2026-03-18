import * as Sentry from "@sentry/react-router/cloudflare";
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";

Sentry.init({
  dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
  sendDefaultPii: true,

  integrations: [
    Sentry.reactRouterTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      triggerLabel: "제보 및 건의",
      formTitle: "제보 및 건의",
      submitButtonLabel: "제출",
      cancelButtonLabel: "취소",
      confirmButtonLabel: "확인",
      addScreenshotButtonLabel: "스크린샷 첨부",
      removeScreenshotButtonLabel: "스크린샷 제거",
      nameLabel: "이름",
      namePlaceholder: "이름",
      emailLabel: "이메일",
      emailPlaceholder: "email@example.com",
      isRequiredLabel: "(필수)",
      messageLabel: "설명",
      messagePlaceholder: "어떤 문제가 있었나요? 자세히 알려주세요.",
      successMessageText: "소중한 제보 감사합니다!",
    }),
  ],

  tracesSampleRate: 0.1,
  tracePropagationTargets: [/^\//, /^https:\/\/divelog\.ada-kr-pos\.com/],

  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.5,
});

window.addEventListener("load", () => {
  setTimeout(async () => {
    const { replayIntegration } = await import("@sentry/react-router/cloudflare");
    Sentry.addIntegration(replayIntegration());
  }, 2000);
});

// 배포 후 구 청크 로딩 실패 시 자동 새로고침 (1회만)
window.addEventListener("error", (event) => {
  const msg = event.message ?? "";
  if (
    (msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Load failed")) &&
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
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Load failed")) &&
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

// Web Vitals 수집
onLCP((metric) => {
  console.log("[web-vitals]", metric.name, Math.round(metric.value), metric.rating);
});

onINP((metric) => {
  console.log("[web-vitals]", metric.name, Math.round(metric.value), metric.rating);
});

onCLS((metric) => {
  console.log("[web-vitals]", metric.name, Math.round(metric.value * 1000), metric.rating);
});

onFCP((metric) => {
  console.log("[web-vitals]", metric.name, Math.round(metric.value), metric.rating);
});

onTTFB((metric) => {
  console.log("[web-vitals]", metric.name, Math.round(metric.value), metric.rating);
});

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />, {
    onRecoverableError(error) {
      Sentry.captureException(error, { tags: { type: "hydration" } });
    },
  });
});
