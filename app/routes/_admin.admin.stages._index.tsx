import type { Route } from "./+types/_admin.admin.stages._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { stages } from "../db/schema.server";
import { sql } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Stage 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.stages" });
  logger.info("loader_start");
  return { stages: await db(context.cloudflare.env.DB).select().from(stages).orderBy(sql`"order" ASC`) };
}
export default function AdminStagesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Stage 관리</h2>
      {loaderData.stages.length === 0 ? (
        <EmptyState variant="generic" message="등록된 Stage가 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["순서", "이름", "유형", "상태", "현재", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.stages.map((s) => (
              <tr key={s.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px]">{s.order}</td>
                <td className="px-3 py-2 text-[13px] text-admin-text">{s.name}</td>
                <td className="px-3 py-2 text-[13px]">{s.type}</td>
                <td className="px-3 py-2 text-[13px]">{s.status}</td>
                <td className="px-3 py-2 text-[13px]">{s.isCurrent ? "✓" : ""}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/stages/${s.id}`} className="text-xs text-admin-accent hover:underline">편집</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
