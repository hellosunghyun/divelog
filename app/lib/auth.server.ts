import type { AuthContext } from "@adakrpos/auth";

const authCache = new WeakMap<Request, AuthContext>();
const debugCache = new WeakMap<Request, string>();

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

export function getAuthDebug(request: Request): string {
  return debugCache.get(request) ?? "not-yet";
}

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const cached = authCache.get(request);
  if (cached) return cached;

  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) {
    debugCache.set(request, "no-cookie");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  if (!apiKey) {
    debugCache.set(request, "no-api-key");
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
      debugCache.set(request, `api-${res.status}`);
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }

    const data = (await res.json()) as { user: NonNullable<AuthContext["user"]>; session: NonNullable<AuthContext["session"]> };
    if (!data.user || !data.session) {
      debugCache.set(request, "no-user-data");
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }

    debugCache.set(request, `ok:${data.user.nickname ?? data.user.name}`);
    const auth: AuthContext = { user: data.user, session: data.session, isAuthenticated: true };
    authCache.set(request, auth);
    return auth;
  } catch (e) {
    debugCache.set(request, `err:${e instanceof Error ? e.message : String(e)}`);
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
