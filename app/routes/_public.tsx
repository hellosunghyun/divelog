import { Outlet, data } from "react-router";
import type { Route } from "./+types/_public";
import { getAuth, getAuthDebug } from "../lib/auth.server";
import { getOrCreateLearnerProfile } from "../db/queries/learners.server";
import { ensureAdminByEmail } from "../lib/auth.middleware";
import GlobalNav from "../components/GlobalNav";
import Footer from "../components/Footer";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);

  if (auth.isAuthenticated && auth.user) {
    // 백그라운드에서 실행 — 페이지 렌더링을 차단하지 않음
    context.cloudflare.ctx.waitUntil(
      Promise.all([
        getOrCreateLearnerProfile(context.cloudflare.env.DB, auth.user),
        ensureAdminByEmail(context, auth.user.id, auth.user.verifiedEmail),
      ]).catch(() => {}),
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
            }
          : null,
    },
    { headers: { "X-Auth-Debug": getAuthDebug(request) } }
  );
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
    </div>
  );
}
