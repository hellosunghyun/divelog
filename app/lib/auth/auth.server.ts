import type { AuthContext } from "@adakrpos/auth";
import { verifyRequest } from "@adakrpos/auth/generic";
import * as Sentry from "@sentry/react-router/cloudflare";

import { createLogger } from "../infra/logger.server";

const authCache = new WeakMap<Request, AuthContext>();
const debugCache = new WeakMap<Request, string>();

const unauthenticatedContext: AuthContext = {
  isAuthenticated: false,
  user: null,
  session: null,
};

export function getAuthDebug(request: Request): string {
  return debugCache.get(request) ?? "not-yet";
}

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const logger = createLogger(request, {}).child({ moduleName: "auth.server" });

  const cached = authCache.get(request);
  if (cached) {
    logger.debug("auth_cache_hit", { isAuthenticated: cached.isAuthenticated });
    return cached;
  }

  if (!apiKey) {
    logger.warn("auth_no_api_key");
    debugCache.set(request, "no-api-key");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  const hasCookie = (request.headers.get("cookie") ?? "").includes("adakrpos_session");
  if (!hasCookie) {
    logger.info("auth_no_cookie");
    debugCache.set(request, "no-cookie");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  try {
    const auth = await verifyRequest(request, { apiKey });

    if (auth.isAuthenticated) {
      logger.info("auth_success", {
        userId: auth.user.id,
        isVerified: auth.user.isVerified,
      });
      debugCache.set(request, `ok:${auth.user.nickname ?? auth.user.name}`);
    } else {
      logger.info("auth_verify_failed");
      debugCache.set(request, "verify-failed");
    }

    authCache.set(request, auth);
    return auth;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isUpstreamError = message.includes("status 5") || message.includes("fetch failed") || message.includes("Load failed");

    if (isUpstreamError) {
      Sentry.captureMessage(`Auth upstream error: ${message}`, {
        level: "warning",
        tags: { type: "auth_sdk", upstream: "true" },
        fingerprint: ["auth-upstream-error"],
      });
    } else {
      Sentry.captureException(e, { tags: { type: "auth_sdk" } });
    }

    logger.error("auth_sdk_error", { error: message });
    debugCache.set(request, `err:${message}`);
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
