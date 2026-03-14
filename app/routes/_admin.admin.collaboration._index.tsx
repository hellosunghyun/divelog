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
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>Collaboration 관리</h2>
      {loaderData.units.length === 0 ? (
        <EmptyState variant="generic" message="Collaboration Unit이 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["이름", "상태", "Slug", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.units.map((u) => (<tr key={u.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{u.name}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{STATUS[u.status] ?? u.status}</td><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>{u.slug}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/collaboration/${u.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>관리</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
