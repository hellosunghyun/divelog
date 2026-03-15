import type { AuthContext } from "@adakrpos/auth";

const authCache = new WeakMap<Request, AuthContext>();

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
  } catch {
    return match[1];
  }
}

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const cached = authCache.get(request);
  if (cached) return cached;

  const sessionId = getSessionIdFromCookie(request);
  const rawCookie = request.headers.get("cookie") ?? "(none)";
  console.log("[auth]", { hasSession: !!sessionId, cookieLength: rawCookie.length, url: request.url });
  if (!sessionId) {
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  try {
    const res = await fetch("https://ada-kr-pos.com/api/sdk/verify-session", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) {
      console.error("[auth] verify-session failed", { status: res.status, sessionId: sessionId.substring(0, 8) });
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }

    const data = (await res.json()) as { user: NonNullable<AuthContext["user"]>; session: NonNullable<AuthContext["session"]> };
    if (!data.user || !data.session) {
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }
    const auth: AuthContext = { user: data.user, session: data.session, isAuthenticated: true };
    authCache.set(request, auth);
    return auth;
  } catch (e) {
    console.error("[auth] verify-session error", { error: e instanceof Error ? e.message : String(e) });
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
