import type { AppLoadContext } from "react-router";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";

import { db } from "../db/client.server";
import { userRoles } from "../db/schema.server";
import { nanoid } from "./utils.server";
import { getAuth, getAuthDebug } from "./auth.server";

function isAuthInfraFailure(debug: string): boolean {
  return debug.startsWith("api-key-") || debug.startsWith("err:");
}

function getLoginRedirectUrl(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.delete("auth_retry");
  const cleanUrl = url.toString();
  const callbackUrl = new URL(cleanUrl);
  callbackUrl.searchParams.set("auth_retry", "1");
  return `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(callbackUrl.toString())}`;
}

export async function getOptionalUser(request: Request, context: AppLoadContext) {
  try {
    const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
    return auth.isAuthenticated ? auth : null;
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request, context: AppLoadContext) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (!auth.isAuthenticated) {
    const debug = getAuthDebug(request);
    const url = new URL(request.url);
    if (isAuthInfraFailure(debug)) {
      throw redirect("/guide?auth_error=config");
    }
    if (url.searchParams.has("auth_retry")) {
      throw redirect("/guide?auth_error=1");
    }
    throw redirect(getLoginRedirectUrl(request));
  }

  return auth;
}

export async function requireVerified(request: Request, context: AppLoadContext) {
  const auth = await requireAuth(request, context);

  if (!auth.user.isVerified) {
    throw redirect("/guide");
  }

  return auth;
}

export async function requireRole(request: Request, context: AppLoadContext, role: string) {
  const auth = await requireAuth(request, context);

  const database = db(context.cloudflare.env.DB);
  const roleRecord = await database
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, auth.user.id), eq(userRoles.role, role)))
    .limit(1);

  if (roleRecord.length === 0) {
    throw redirect(getLoginRedirectUrl(request));
  }

  return auth;
}

export async function bootstrapAdmin(context: AppLoadContext) {
  const adminUserId = context.cloudflare.env.ADMIN_USER_ID;
  if (!adminUserId || adminUserId === "usr_placeholder_replace_with_real_admin_id") {
    return;
  }

  const database = db(context.cloudflare.env.DB);
  const existingAdmin = await database
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, adminUserId), eq(userRoles.role, "admin")))
    .limit(1);

  if (existingAdmin.length > 0) {
    return;
  }

  await database.insert(userRoles).values({
    id: nanoid(),
    userId: adminUserId,
    role: "admin",
    grantedAt: Math.floor(Date.now() / 1000),
  });
}

export async function ensureAdminByEmail(
  context: AppLoadContext,
  userId: string,
  verifiedEmail: string | null,
) {
  if (!verifiedEmail) return;

  const adminEmailsRaw = (context.cloudflare.env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS ?? "";
  const adminEmails = adminEmailsRaw.split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0 || !adminEmails.includes(verifiedEmail.toLowerCase())) {
    return;
  }

  const database = db(context.cloudflare.env.DB);
  const existing = await database
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin")))
    .limit(1);

  if (existing.length > 0) return;

  await database.insert(userRoles).values({
    id: nanoid(),
    userId,
    role: "admin",
    grantedAt: Math.floor(Date.now() / 1000),
  });
}
