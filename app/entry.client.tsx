import * as Sentry from "@sentry/react-router/cloudflare";
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";

Sentry.init({
  dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
  sendDefaultPii: true,

  integrations: [Sentry.reactRouterTracingIntegration()],

  tracesSampleRate: 0.1,
  tracePropagationTargets: [/^\//, /^https:\/\/divelog\.ada-kr-pos\.com/],

  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.5,
});

function isChunkLoadErrorMessage(message: string) {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Load failed")
  );
}

function reloadAfterSentryDrain() {
  const doReload = () => window.location.reload();

  if (typeof Sentry.flush === "function") {
    void Sentry.flush(1200).then(doReload).catch(doReload);
    return;
  }

  window.setTimeout(doReload, 150);
}

window.addEventListener("load", () => {
  setTimeout(async () => {
    const { replayIntegration, feedbackIntegration } = await import(
      "@sentry/react-router/cloudflare"
    );
    Sentry.addIntegration(replayIntegration());
    Sentry.addIntegration(
      feedbackIntegration({
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
    );
  }, 2000);
});

// 배포 후 구 청크 로딩 실패 시 자동 새로고침 (1회만)
window.addEventListener("error", (event) => {
  const msg = event.message ?? "";
  if (isChunkLoadErrorMessage(msg)) {
    Sentry.captureMessage(`chunk_load_error: ${msg}`, {
      level: "error",
      tags: { type: "chunk_load_error" },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    if (!sessionStorage.getItem("chunk_reload")) {
      sessionStorage.setItem("chunk_reload", "1");
      reloadAfterSentryDrain();
    }
    return;
  }

  if (event.error instanceof Error) {
    Sentry.captureException(event.error, {
      tags: { type: "window_error" },
      extra: {
        message: msg,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  } else if (msg) {
    Sentry.captureMessage(`window_error: ${msg}`, {
      level: "error",
      tags: { type: "window_error" },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message ?? event.reason ?? "");
  if (isChunkLoadErrorMessage(msg)) {
    Sentry.captureMessage(`chunk_load_unhandledrejection: ${msg}`, {
      level: "error",
      tags: { type: "chunk_load_error" },
    });

    if (!sessionStorage.getItem("chunk_reload")) {
      sessionStorage.setItem("chunk_reload", "1");
      reloadAfterSentryDrain();
    }
    return;
  }

  if (event.reason instanceof Error) {
    Sentry.captureException(event.reason, {
      tags: { type: "unhandledrejection" },
    });
    return;
  }

  Sentry.captureMessage(`unhandledrejection: ${msg || "unknown"}`, {
    level: "error",
    tags: { type: "unhandledrejection" },
    extra: {
      reason: event.reason,
    },
  });
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
