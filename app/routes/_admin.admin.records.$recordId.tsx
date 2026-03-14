import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.records.$recordId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { records } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const record = await db(context.cloudflare.env.DB).select().from(records).where(eq(records.id, params.recordId)).limit(1);
  if (!record[0]) throw data("Record not found", { status: 404 });
  return { record: record[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(records).set({ moderationStatus: f.get("moderationStatus") as string, moderationNote: (f.get("note") as string) || null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(records.id, params.recordId));
  throw redirect("/admin/records");
}
export function meta(_: Route.MetaArgs) { return [{ title: "기록 검토" }]; }
export default function AdminRecordDetailPage({ loaderData }: Route.ComponentProps) {
  const { record } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/records" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>기록 검토</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>{record.title}</h3>
          <p style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{record.content.substring(0, 500)}{record.content.length > 500 ? "..." : ""}</p>
        </div>
        <form method="post" style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "16px", border: "1px solid var(--color-admin-border)", display: "flex", flexDirection: "column", gap: "8px", height: "fit-content" }}>
          <label style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)" }}>Moderation</label>
          <select name="moderationStatus" defaultValue={record.moderationStatus ?? "clean"} style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", fontSize: "13px" }}><option value="clean">Clean</option><option value="flagged">Flagged</option><option value="hidden">Hidden</option></select>
          <textarea name="note" placeholder="메모 (선택)" rows={2} defaultValue={record.moderationNote ?? ""} style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
          <button type="submit" style={{ padding: "6px 12px", borderRadius: "4px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}>저장</button>
        </form>
      </div>
    </div>
  );
}
