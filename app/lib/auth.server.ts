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

  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasSession = cookieHeader.includes("adakrpos_session");
  console.log("[auth] cookie present:", hasSession, "| cookie header:", cookieHeader.substring(0, 200));

  try {
    const auth = await verifyRequest(request, { apiKey });
    console.log("[auth] result:", auth.isAuthenticated);
    authCache.set(request, auth);
    return auth;
  } catch (error) {
    console.error("[auth] verifyRequest failed:", error);
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
