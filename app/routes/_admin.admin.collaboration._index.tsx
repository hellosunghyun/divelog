import type { Route } from "./+types/_admin.admin.collaboration._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collaborationUnits } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
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
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["이름", "상태", "Slug", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.units.map((u) => (
              <tr key={u.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px] text-admin-text">{u.name}</td>
                <td className="px-3 py-2 text-[13px]">{STATUS[u.status] ?? u.status}</td>
                <td className="px-3 py-2 text-[13px] text-admin-text-secondary">{u.slug}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/collaboration/${u.id}`} className="text-xs text-admin-accent hover:underline">관리</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
