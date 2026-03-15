import type { AuthContext } from "@adakrpos/auth";
import { verifyRequest } from "@adakrpos/auth/generic";

const authCache = new WeakMap<Request, AuthContext>();
const debugCache = new WeakMap<Request, string>();

const unauthenticatedContext: AuthContext = {
  isAuthenticated: false,
  user: null,
  session: null,
};

const apiKeyValidityCache = new Map<string, { valid: boolean; checkedAt: number }>();
const API_KEY_VALIDITY_TTL_MS = 60_000;

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

function isApiKeyConfigured(apiKey: string): boolean {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("placeholder")) return false;
  if (!trimmed.startsWith("ak_")) return false;
  return true;
}

async function isApiKeyValid(apiKey: string): Promise<boolean> {
  const now = Date.now();
  const cached = apiKeyValidityCache.get(apiKey);
  if (cached && now - cached.checkedAt < API_KEY_VALIDITY_TTL_MS) {
    return cached.valid;
  }

  try {
    const response = await fetch("https://ada-kr-pos.com/api/sdk/verify-key", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const valid = response.ok;
    apiKeyValidityCache.set(apiKey, { valid, checkedAt: now });
    return valid;
  } catch {
    apiKeyValidityCache.set(apiKey, { valid: true, checkedAt: now });
    return true;
  }
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

  if (!isApiKeyConfigured(apiKey)) {
    debugCache.set(request, "api-key-misconfigured");
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }

  try {
    const auth = await verifyRequest(request, { apiKey });

    if (!auth.isAuthenticated) {
      const keyValid = await isApiKeyValid(apiKey);
      debugCache.set(request, keyValid ? "session-invalid" : "api-key-invalid");
      authCache.set(request, unauthenticatedContext);
      return unauthenticatedContext;
    }

    debugCache.set(request, `ok:${auth.user.nickname ?? auth.user.name}`);
    authCache.set(request, auth);
    return auth;
  } catch (e) {
    debugCache.set(request, `err:${e instanceof Error ? e.message : String(e)}`);
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
