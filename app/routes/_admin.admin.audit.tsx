import type { Route } from "./+types/_admin.admin.audit";
import { db } from "../db/client.server";
import { auditLogs } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "감사 로그" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const targetType = url.searchParams.get("type");
  const database = db(context.cloudflare.env.DB);
  const base = database.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  const logs = targetType ? await base.where(eq(auditLogs.targetType, targetType)) : await base;
  return { logs, targetType };
}
export default function AdminAuditPage({ loaderData }: Route.ComponentProps) {
  const { logs, targetType } = loaderData;
  const TARGET_TYPES = ["record", "stage", "learner", "response", "challenge", "collaboration", "memory"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>감사 로그</h2>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <a href="/admin/audit" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: !targetType ? "var(--color-admin-accent)" : "var(--color-admin-border)", color: !targetType ? "white" : "var(--color-admin-text)", textDecoration: "none" }}>전체</a>
          {TARGET_TYPES.map((t) => <a key={t} href={`?type=${t}`} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: targetType === t ? "var(--color-admin-accent)" : "var(--color-admin-border)", color: targetType === t ? "white" : "var(--color-admin-text)", textDecoration: "none" }}>{t}</a>)}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
        <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["행위자", "대상 유형", "대상 ID", "액션", "시각"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
        <tbody>{logs.map((log) => (<tr key={log.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}>
          <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontFamily: "monospace" }}>{log.actorId.substring(0, 12)}</td>
          <td style={{ padding: "10px 16px", fontSize: "13px" }}>{log.targetType}</td>
          <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontFamily: "monospace" }}>{log.targetId.substring(0, 12)}</td>
          <td style={{ padding: "10px 16px", fontSize: "13px" }}>{log.action}</td>
          <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)" }}>{new Date((log.createdAt ?? 0) * 1000).toLocaleString("ko-KR")}</td>
        </tr>))}</tbody>
      </table>
    </div>
  );
}
