import type { AppLoadContext } from "react-router";
import { and, eq } from "drizzle-orm";
import { redirect } from "react-router";

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
    logger.warn("auth_optional_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function requireAuth(request: Request, context: AppLoadContext) {
  const logger = createLogger(request, context.cloudflare.env).child({ moduleName: "auth.middleware" });
  const { getAuthDebug } = await import("./auth.server");
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (!auth.isAuthenticated) {
    const url = new URL(request.url);
    const hasSessionCookie = (request.headers.get("cookie") ?? "").includes("adakrpos_session");
    const debugInfo = getAuthDebug(request);
    const hasApiKey = !!context.cloudflare.env.ADAKRPOS_API_KEY;

    if (hasSessionCookie) {
      logger.info("auth_retry_page", {
        debugInfo,
        hasApiKey,
        returnPath: url.pathname,
      });
      throw new Response(authRetryPage(url.pathname, debugInfo, hasApiKey), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Auth-Debug": debugInfo,
        },
      });
    }

    logger.info("auth_redirect", {
      returnUrl: `${url.pathname}${url.search}`,
    });
    throw redirect(getLoginRedirectUrl(request));
  }

  return auth;
}

function authRetryPage(returnPath: string, debugInfo: string, hasApiKey: boolean): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>인증 확인 중 — divelog</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #F6F8FB; color: #1D1D1F; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 20px; padding: 48px; max-width: 420px; text-align: center; border: 1px solid #E3E8EF; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    p { font-size: 15px; color: #6E6E73; line-height: 1.6; margin: 0 0 24px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #E3E8EF; border-top-color: #146C94; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn { display: inline-block; background: #146C94; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 600; }
    .btn-secondary { display: inline-block; color: #6E6E73; padding: 8px 16px; font-size: 13px; text-decoration: none; margin-top: 12px; }
    #status { font-size: 13px; color: #8C8C91; margin-bottom: 16px; }
    .debug { font-size: 11px; color: #8C8C91; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E3E8EF; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h1>인증을 확인하고 있습니다</h1>
    <p>배포 직후에는 인증 확인이 잠시 지연될 수 있습니다.<br>자동으로 재시도합니다.</p>
    <div id="status">확인 중...</div>
    <div id="actions" style="display:none">
      <a class="btn" href="https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(`https://divelog.ada-kr-pos.com${returnPath}`)}">다시 로그인</a>
      <br>
      <a class="btn-secondary" href="/">홈으로 이동</a>
    </div>
    <div class="debug">debug: ${debugInfo} | apiKey: ${hasApiKey ? "있음" : "없음"}</div>
  </div>
  <script>
    let attempt = 0;
    const maxAttempts = 5;
    async function tryAuth() {
      attempt++;
      document.getElementById('status').textContent = '확인 중... (' + attempt + '/' + maxAttempts + ')';
      try {
        const res = await fetch(window.location.pathname, { credentials: 'include', redirect: 'manual' });
        if (res.type === 'opaqueredirect') {
          document.getElementById('status').textContent = '인증 확인 완료! 이동 중...';
          window.location.reload();
          return;
        }
        const debugHeader = res.headers.get('x-auth-debug') || '';
        if (debugHeader.startsWith('ok:')) {
          document.getElementById('status').textContent = '인증 확인 완료! 이동 중...';
          window.location.reload();
          return;
        }
        document.querySelector('.debug').textContent = 'attempt ' + attempt + ': ' + debugHeader + ' | status: ' + res.status;
      } catch (e) {
        document.querySelector('.debug').textContent = 'attempt ' + attempt + ': fetch error: ' + e.message;
      }
      if (attempt >= maxAttempts) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('status').textContent = '인증을 확인할 수 없습니다.';
        document.getElementById('actions').style.display = 'block';
        return;
      }
      setTimeout(tryAuth, 2000 * attempt);
    }
    setTimeout(tryAuth, 3000);
  </script>
</body>
</html>`;
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
