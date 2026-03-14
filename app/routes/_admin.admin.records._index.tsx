import type { Route } from "./+types/_admin.admin.records._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { records, learnerProfiles } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "기록 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const database = db(context.cloudflare.env.DB);
  const base = database.select({ record: records, author: { displayName: learnerProfiles.displayName } }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId)).orderBy(desc(records.createdAt)).limit(50);
  const result = filter === "flagged" ? await base.where(eq(records.moderationStatus, "flagged")) : await base;
  return { records: result };
}
export default function AdminRecordsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>기록 관리</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/admin/records" style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "4px", backgroundColor: "var(--color-admin-border)", color: "var(--color-admin-text)", textDecoration: "none" }}>전체</a>
          <a href="?filter=flagged" style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "4px", backgroundColor: "var(--color-error)", color: "white", textDecoration: "none" }}>Flagged</a>
        </div>
      </div>
      {loaderData.records.length === 0 ? (
        <EmptyState variant="generic" message="기록이 없습니다" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px" }}>
          <thead><tr style={{ borderBottom: "1px solid var(--color-admin-border)" }}>{["제목", "작성자", "형식", "공개", "moderation", "작업"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "12px", color: "var(--color-admin-text-secondary)", fontWeight: "600" }}>{h}</th>)}</tr></thead>
          <tbody>{loaderData.records.map(({ record, author }) => (<tr key={record.id} style={{ borderBottom: "1px solid var(--color-admin-border)" }}><td style={{ padding: "10px 16px", fontSize: "13px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.title}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{author?.displayName ?? "-"}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{record.format}</td><td style={{ padding: "10px 16px", fontSize: "13px" }}>{record.visibility}</td><td style={{ padding: "10px 16px", fontSize: "13px", color: record.moderationStatus === "flagged" ? "var(--color-error)" : undefined }}>{record.moderationStatus}</td><td style={{ padding: "10px 16px" }}><Link to={`/admin/records/${record.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>검토</Link></td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
