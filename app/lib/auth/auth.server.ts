import type { AuthContext } from "@adakrpos/auth";

import { createLogger, createModuleLogger } from "../infra/logger.server";

const authCache = new WeakMap<Request, AuthContext>();
const debugCache = new WeakMap<Request, string>();
const cookieLogger = createModuleLogger("auth.cookie");

const unauthenticatedContext: AuthContext = {
  isAuthenticated: false,
  user: null,
  session: null,
};

function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)adakrpos_session=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    cookieLogger.debug("auth_cookie_decode_fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return match[1];
  }
}

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

  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) {
    logger.info("auth_no_cookie");
    debugCache.set(request, "no-cookie");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  if (!apiKey) {
    logger.warn("auth_no_api_key");
    debugCache.set(request, "no-api-key");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  const maxRetries = 1;
  const verifySessionUrl = "https://ada-kr-pos.com/api/sdk/verify-session";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info("auth_api_call", { attempt: attempt + 1, maxRetries: maxRetries + 1 });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(verifySessionUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        if (attempt < maxRetries && res.status >= 500) {
          logger.warn("auth_api_retry", { attempt: attempt + 1, status: res.status });
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        logger.info("auth_api_failed", { attempt: attempt + 1, status: res.status });
        debugCache.set(request, `api-${res.status}`);
        authCache.set(request, unauthenticatedContext);
        return unauthenticatedContext;
      }

      const data = (await res.json()) as { user: NonNullable<AuthContext["user"]>; session: NonNullable<AuthContext["session"]> };
      if (!data.user || !data.session) {
        logger.warn("auth_missing_user_data", { attempt: attempt + 1 });
        debugCache.set(request, "no-user-data");
        authCache.set(request, unauthenticatedContext);
        return unauthenticatedContext;
      }

      logger.info("auth_success", {
        attempt: attempt + 1,
        userId: data.user.id,
        isVerified: data.user.isVerified,
      });
      debugCache.set(request, `ok:${data.user.nickname ?? data.user.name}`);
      const auth: AuthContext = { user: data.user, session: data.session, isAuthenticated: true };
      authCache.set(request, auth);
      return auth;
    } catch (e) {
      if (attempt < maxRetries) {
        logger.warn("auth_api_error_retry", {
          attempt: attempt + 1,
          error: e instanceof Error ? e.message : String(e),
        });
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      logger.error("auth_api_error", {
        attempt: attempt + 1,
        error: e instanceof Error ? e.message : String(e),
      });
      debugCache.set(request, `err:${e instanceof Error ? e.message : String(e)}`);
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }
  }

  authCache.set(request, unauthenticatedContext);
  return unauthenticatedContext;
}
