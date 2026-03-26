import { getTraceMetaTags } from "@sentry/cloudflare";

/**
 * UTF-8-safe replacement for Sentry's `injectTraceMetaTags()`.
 *
 * The Sentry Cloudflare build (`@sentry/react-router/cloudflare` v10.43.0)
 * creates a new stateless `TextDecoder` per chunk without `{ stream: true }`.
 * When `renderToReadableStream()` emits a chunk that ends mid-multibyte
 * UTF-8 character (e.g. Korean 3-byte sequences), the incomplete trailing
 * bytes become U+FFFD, permanently corrupting the streamed HTML.
 *
 * Fix: reuse one `TextDecoder` with `{ stream: true }` until `</head>` is
 * found, then pass all subsequent chunks as raw bytes (zero overhead).
 */
export function safeInjectTraceMetaTags(
  body: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const HEAD_CLOSING_TAG = "</head>";
  const MAX_SEARCH_BYTES = 64 * 1024;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let injected = false;
  let buffer = "";
  let totalBytes = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        const remaining = decoder.decode();
        const pending = buffer + remaining;
        if (pending.length > 0) {
          controller.enqueue(encoder.encode(pending));
          buffer = "";
        }
        controller.close();
        return;
      }

      if (injected) {
        controller.enqueue(value);
        return;
      }

      totalBytes += value.byteLength;
      buffer += decoder.decode(value, { stream: true });

      const headIndex = buffer.indexOf(HEAD_CLOSING_TAG);

      if (headIndex !== -1) {
        const metaTags = getTraceMetaTags();
        const modified = buffer.replace(
          HEAD_CLOSING_TAG,
          `${metaTags}${HEAD_CLOSING_TAG}`,
        );
        controller.enqueue(encoder.encode(modified));
        buffer = "";
        injected = true;
        return;
      }

      if (totalBytes > MAX_SEARCH_BYTES) {
        controller.enqueue(encoder.encode(buffer));
        buffer = "";
        injected = true;
      }
    },
  });
}
