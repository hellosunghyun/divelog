import { Outlet, isRouteErrorResponse } from "react-router";
import * as Sentry from "@sentry/react-router/cloudflare";
import type { Route } from "./+types/_admin";
import { requireRole, bootstrapAdmin } from "~/lib/auth/auth.middleware";
import AdminSidebar from "~/components/admin/AdminSidebar";
import AdminContextBar from "~/components/admin/AdminContextBar";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { createLogger } = await import("~/lib/infra/logger.server");
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.layout" });
  logger.info("loader_start");
  await bootstrapAdmin(context);
  const auth = await requireRole(request, context, "admin");

  Sentry.setUser({ id: auth.user!.id, username: auth.user!.nickname ?? auth.user!.name ?? undefined });

  return {
    adminUser: {
      id: auth.user!.id,
      name: auth.user!.nickname ?? auth.user!.name ?? "관리자",
    },
  };
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-admin-bg">
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (error instanceof Error) {
    Sentry.captureException(error);
  }

  let message = "Admin 오류";
  let details = "예상치 못한 오류가 발생했습니다.";

  if (isRouteErrorResponse(error)) {
    message = `오류 ${error.status}`;
    details = error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg">
      <div className="max-w-md w-full bg-admin-surface border border-admin-border rounded-lg p-8 text-center">
        <p className="text-sm font-medium text-error mb-2">{message}</p>
        <p className="text-sm text-admin-text-secondary mb-6">{details}</p>
        <a href="/admin" className="text-sm text-admin-accent hover:underline">
          대시보드로 이동
        </a>
      </div>
    </div>
  );
}
