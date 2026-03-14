import type { Route } from "./+types/_admin.admin.templates._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { templates } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "템플릿" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { templates: await db(context.cloudflare.env.DB).select().from(templates).orderBy(asc(templates.name)) };
}
export default function AdminTemplatesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>템플릿 ({loaderData.templates.length}개)</h2>
      {loaderData.templates.length === 0 ? (
        <EmptyState variant="generic" message="등록된 템플릿이 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["이름", "형식", "리듬", "활성", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.templates.map((t) => (<tr key={t.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", color: "var(--color-admin-text)" }}>{t.name}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{t.form ?? "-"}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{t.rhythm ?? "-"}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{t.active ? "✓" : "✗"}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/templates/${t.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>편집</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
