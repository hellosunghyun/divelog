import type { AppLoadContext } from "react-router";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";
import * as Sentry from "@sentry/react-router/cloudflare";

import { db } from "../../db/client.server";
import { userRoles } from "../../db/schema.server";
import { nanoid } from "../utils/utils.server";
import { getAuth } from "./auth.server";
import { createLogger, createModuleLogger } from "../infra/logger.server";

const adminLogger = createModuleLogger("auth.middleware");

function getLoginRedirectUrl(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.delete("auth_retry");
  const cleanUrl = url.toString();
  const callbackUrl = new URL(cleanUrl);
  callbackUrl.searchParams.set("auth_retry", "1");
  return `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(callbackUrl.toString())}`;
}

export async function getOptionalUser(request: Request, context: AppLoadContext) {
  const logger = createLogger(request, context.cloudflare.env).child({ moduleName: "auth.middleware" });

  try {
    const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
    return auth.isAuthenticated ? auth : null;
  } catch (error) {
    Sentry.captureException(error, { tags: { type: "auth_optional" } });
    logger.warn("auth_optional_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function requireAuth(request: Request, context: AppLoadContext) {
  const logger = createLogger(request, context.cloudflare.env).child({ moduleName: "auth.middleware" });
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (!auth.isAuthenticated) {
    const url = new URL(request.url);
    const hasSessionCookie = (request.headers.get("cookie") ?? "").includes("adakrpos_session");

    if (hasSessionCookie) {
      const { getAuthDebug } = await import("./auth.server");
      const debugInfo = getAuthDebug(request);
      logger.warn("auth_cookie_present_but_verify_failed", {
        debugInfo,
        hasApiKey: !!context.cloudflare.env.ADAKRPOS_API_KEY,
        returnPath: url.pathname,
      });
    }

    logger.info("auth_redirect", {
      returnUrl: `${url.pathname}${url.search}`,
    });
    throw redirect(getLoginRedirectUrl(request));
  }

  return auth;
}

export async function requireVerified(request: Request, context: AppLoadContext) {
  const logger = createLogger(request, context.cloudflare.env).child({ moduleName: "auth.middleware" });
  const auth = await requireAuth(request, context);

  if (!auth.user.isVerified) {
    logger.info("auth_unverified_redirect", { userId: auth.user.id });
    throw redirect("/guide");
  }

  return auth;
}

export async function requireRole(request: Request, context: AppLoadContext, role: string) {
  const logger = createLogger(request, context.cloudflare.env).child({ moduleName: "auth.middleware" });
  const auth = await requireAuth(request, context);

  const database = db(context.cloudflare.env.DB);
  const roleRecord = await database
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, auth.user.id), eq(userRoles.role, role)))
    .limit(1);

  if (roleRecord.length === 0) {
    logger.info("auth_role_denied", {
      requiredRole: role,
      userId: auth.user.id,
    });
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

  adminLogger.info("admin_bootstrap", { userId: adminUserId });
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

  adminLogger.info("admin_email_grant", {
    grantSource: "admin_emails",
    userId,
  });
}
