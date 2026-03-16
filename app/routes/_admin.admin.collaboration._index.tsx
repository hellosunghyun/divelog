import type { Route } from "./+types/_admin.admin.collaboration._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { collaborationUnits } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration" });
  logger.info("loader_start");
  return { units: await db(context.cloudflare.env.DB).select().from(collaborationUnits).orderBy(asc(collaborationUnits.name)) };
}
export default function AdminCollaborationPage({ loaderData }: Route.ComponentProps) {
  const STATUS: Record<string, string> = { forming: "구성 중", active: "탐구 중", restructured: "재편성됨", archived: "아카이브" };
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Collaboration 관리</h2>
      {loaderData.units.length === 0 ? (
        <EmptyState variant="generic" message="Collaboration Unit이 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-bg">
                {["이름", "상태", "Slug", "작업"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.units.map((u) => (
                <tr key={u.id} className="border-t border-admin-border hover:bg-admin-bg/50 transition-colors">
                  <td className="px-4 py-3 text-meta text-admin-text">{u.name}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{STATUS[u.status] ?? u.status}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{u.slug}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/collaboration/${u.id}`} className="text-caption text-admin-accent hover:underline">관리</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
