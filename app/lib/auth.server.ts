import type { AuthContext } from "@adakrpos/auth";
import { verifyRequest } from "@adakrpos/auth/generic";

const authCache = new WeakMap<Request, AuthContext>();

const unauthenticatedContext: AuthContext = {
  isAuthenticated: false,
  user: null,
  session: null,
};

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const cached = authCache.get(request);
  if (cached) {
    return cached;
  }

  try {
    const auth = await verifyRequest(request, { apiKey });
    authCache.set(request, auth);
    return auth;
  } catch (error) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const hasSession = cookieHeader.includes("adakrpos_session");
    console.error("[auth] verifyRequest failed", {
      hasSessionCookie: hasSession,
      apiKeyPrefix: apiKey?.substring(0, 6) ?? "MISSING",
      error: error instanceof Error ? error.message : String(error),
    });
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
