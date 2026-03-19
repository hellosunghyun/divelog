import { Outlet, data, useRevalidator } from "react-router";
import * as React from "react";
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

  const adminEmails = ((context.cloudflare.env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = auth.isAuthenticated && auth.user
    ? adminEmails.includes((auth.user.verifiedEmail ?? "").toLowerCase())
    : false;

  if (auth.isAuthenticated && auth.user) {
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
  const revalidator = useRevalidator();

  React.useEffect(() => {
    let lastRevalidatedAt = 0;

    const revalidateIfNeeded = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible") return;
      if (revalidator.state !== "idle") return;
      if (now - lastRevalidatedAt < 1000) return;
      lastRevalidatedAt = now;
      revalidator.revalidate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidateIfNeeded();
      }
    };

    const handleWindowFocus = () => {
      revalidateIfNeeded();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        revalidateIfNeeded();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidator]);

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
