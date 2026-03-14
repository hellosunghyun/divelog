import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.dialogue.$responseId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { responses, records } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const response = await database.select().from(responses).where(eq(responses.id, params.responseId)).limit(1);
  if (!response[0]) throw data("Response not found", { status: 404 });
  const record = response[0].recordId ? await database.select().from(records).where(eq(records.id, response[0].recordId)).limit(1) : [];
  return { response: response[0], record: record[0] ?? null };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(responses).set({ moderationStatus: f.get("moderationStatus") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(responses.id, params.responseId));
  throw redirect("/admin/dialogue");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 검토" }]; }
export default function AdminDialogueDetailPage({ loaderData }: Route.ComponentProps) {
  const { response, record } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/dialogue" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>Dialogue 검토</h2></div>
      {record && <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "16px", border: "1px solid var(--color-admin-border)", marginBottom: "16px" }}><p style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "4px" }}>원문 기록</p><p style={{ fontSize: "13px", color: "var(--color-admin-text)" }}>{record.title}</p></div>}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <span style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)" }}>{response.type}</span>
          <p style={{ fontSize: "14px", color: "var(--color-admin-text)", marginTop: "8px", lineHeight: "1.6" }}>{response.content}</p>
        </div>
        <form method="post" style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "16px", border: "1px solid var(--color-admin-border)", display: "flex", flexDirection: "column", gap: "8px", height: "fit-content" }}>
          <label style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)" }}>Moderation</label>
          <select name="moderationStatus" defaultValue={response.moderationStatus ?? "clean"} style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--color-admin-border)", fontSize: "13px" }}><option value="clean">Clean</option><option value="flagged">Flagged</option><option value="hidden">Hidden</option></select>
          <button type="submit" style={{ padding: "6px 12px", borderRadius: "4px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}>저장</button>
        </form>
      </div>
    </div>
  );
}
