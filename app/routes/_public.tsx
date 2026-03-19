import { Outlet, data } from "react-router";
import * as Sentry from "@sentry/react-router/cloudflare";
import type { Route } from "./+types/_public";
import { ensureAdminByEmail } from "~/lib/auth/auth.middleware.server";
import { getOrCreateLearnerProfile } from "~/db/queries/learners/learners.server";
import { getAuth, getAuthDebug } from "~/lib/auth/auth.server";
import { createLogger } from "~/lib/infra/logger.server";
import GlobalNav from "~/components/layout/GlobalNav";
import Footer from "~/components/layout/Footer";
import { FloatingWriteCTA } from "~/components/layout/FloatingWriteCTA";

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "_public" });
  logger.info("loader_start");
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  let isAdmin = false;

  if (auth.isAuthenticated && auth.user) {
    // Check admin status via ADMIN_EMAILS env var (no DB query)
    const adminEmailsRaw = (context.cloudflare.env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS ?? "";
    const adminEmails = adminEmailsRaw
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
    isAdmin = auth.user.verifiedEmail
      ? adminEmails.includes(auth.user.verifiedEmail.toLowerCase())
      : false;

    Sentry.setUser({
      id: auth.user.id,
      username: auth.user.nickname ?? auth.user.name ?? undefined,
      email: auth.user.verifiedEmail ?? undefined,
    });

    context.cloudflare.ctx.waitUntil(
      Promise.all([
        getOrCreateLearnerProfile(context.cloudflare.env.DB, auth.user),
        ensureAdminByEmail(context, auth.user.id, auth.user.verifiedEmail),
      ]).catch((err) => {
        Sentry.captureException(err, { tags: { type: "background_task" } });
        logger.error("background_task_error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }),
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
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return false;
  }
  return defaultShouldRevalidate;
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
      <main className="flex-1 [contain:layout_style]">
        <Outlet />
      </main>
      <Footer />
      <FloatingWriteCTA />
    </div>
  );
}
