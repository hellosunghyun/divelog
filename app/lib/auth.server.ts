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
  } catch {
    authCache.set(request, unauthenticatedContext);
    return unauthenticatedContext;
  }
}
