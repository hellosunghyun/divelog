import type { Route } from "./+types/_admin.admin.stages._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages } from "../db/schema.server";
import { sql } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Stage 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { stages: await db(context.cloudflare.env.DB).select().from(stages).orderBy(sql`"order" ASC`) };
}
export default function AdminStagesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>Stage 관리</h2>
      {loaderData.stages.length === 0 ? (
        <EmptyState variant="generic" message="등록된 Stage가 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["순서", "이름", "유형", "상태", "현재", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.stages.map((s) => (<tr key={s.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.order}</td><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{s.name}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.type}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.status}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{s.isCurrent ? "✓" : ""}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/stages/${s.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>편집</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
