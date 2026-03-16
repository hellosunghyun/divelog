import { Outlet } from "react-router";
import type { Route } from "./+types/_admin";
import { requireRole, bootstrapAdmin } from "~/lib/auth.middleware";
import { createLogger } from "~/lib/logger.server";
import AdminSidebar from "~/components/admin/AdminSidebar";
import AdminContextBar from "~/components/admin/AdminContextBar";

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.layout" });
  logger.info("loader_start");
  await bootstrapAdmin(context);
  const auth = await requireRole(request, context, "admin");

  return {
    adminUser: {
      id: auth.user!.id,
      name: auth.user!.name ?? auth.user!.nickname ?? "관리자",
    },
  };
}

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-admin-bg">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminContextBar />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
