import { Outlet, data } from "react-router";
import type { Route } from "./+types/_public";
import { getAuth, getAuthDebug } from "~/lib/auth.server";
import { getOrCreateLearnerProfile } from "~/db/queries/learners.server";
import { ensureAdminByEmail } from "~/lib/auth.middleware";
import { createLogger } from "~/lib/logger.server";
import { db } from "~/db/client.server";
import { userRoles } from "~/db/schema.server";
import { and, eq } from "drizzle-orm";
import GlobalNav from "~/components/GlobalNav";
import Footer from "~/components/Footer";
import { FloatingWriteCTA } from "~/components/FloatingWriteCTA";

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "_public" });
  logger.info("loader_start");
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  let isAdmin = false;

  if (auth.isAuthenticated && auth.user) {
    const database = db(context.cloudflare.env.DB);
    const adminRole = await database
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, auth.user.id), eq(userRoles.role, "admin")))
      .limit(1);
    isAdmin = adminRole.length > 0;

    // 백그라운드에서 실행 — 페이지 렌더링을 차단하지 않음
    context.cloudflare.ctx.waitUntil(
      Promise.all([
        getOrCreateLearnerProfile(context.cloudflare.env.DB, auth.user),
        ensureAdminByEmail(context, auth.user.id, auth.user.verifiedEmail),
      ]).catch((err) =>
        logger.error("background_task_error", {
          error: err instanceof Error ? err.message : String(err),
        })
      ),
    );
  }

  return data(
    {
      isAuthenticated: auth.isAuthenticated,
      user:
        auth.isAuthenticated && auth.user
          ? {
              id: auth.user.id,
              name: auth.user.nickname ?? auth.user.name ?? "익명",
              profilePhotoUrl: auth.user.profilePhotoUrl
                ? auth.user.profilePhotoUrl.startsWith("http")
                  ? auth.user.profilePhotoUrl
                  : `https://ada-kr-pos.com${auth.user.profilePhotoUrl}`
                : null,
              isAdmin,
            }
          : null,
    },
    { headers: { "X-Auth-Debug": getAuthDebug(request) } }
  );
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  // mutation(POST/PUT/DELETE)에서만 revalidation
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  // 일반 GET 네비게이션에서는 스킵
  return false;
}

export function headers({ loaderHeaders }: { loaderHeaders: Headers }) {
  const debug = loaderHeaders.get("X-Auth-Debug");
  const headers = new Headers();
  if (debug) headers.set("X-Auth-Debug", debug);
  return headers;
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <GlobalNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWriteCTA />
    </div>
  );
}
