import type { AuthContext } from "@adakrpos/auth";
import { clearApiKeyCache } from "@adakrpos/auth";
import { verifyRequest } from "@adakrpos/auth/generic";

const authCache = new WeakMap<Request, AuthContext>();

const unauthenticatedContext: AuthContext = {
  isAuthenticated: false,
  user: null,
  session: null,
};

function hasSessionCookie(request: Request): boolean {
  return (request.headers.get("cookie") ?? "").includes("adakrpos_session");
}

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const cached = authCache.get(request);
  if (cached) {
    return cached;
  }

  try {
    const auth = await verifyRequest(request, { apiKey });
    authCache.set(request, auth);
    return auth;
  } catch {
    if (hasSessionCookie(request)) {
      clearApiKeyCache();
      try {
        const retry = await verifyRequest(request, { apiKey });
        authCache.set(request, retry);
        return retry;
      } catch {}
    }
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
