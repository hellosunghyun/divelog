import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.memories.$stageId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collectiveMemories } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const memory = await db(context.cloudflare.env.DB).select().from(collectiveMemories).where(eq(collectiveMemories.id, params.stageId)).limit(1);
  if (!memory[0]) throw data("Memory not found", { status: 404 });
  return { memory: memory[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(collectiveMemories).set({ summary: (f.get("summary") as string) || null, carryForwardQuestion: (f.get("carryForwardQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collectiveMemories.id, params.stageId));
  throw redirect("/admin/memories");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Memory 편집" }]; }
export default function AdminMemoryEditPage({ loaderData }: Route.ComponentProps) {
  const { memory } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/memories" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>Memory 편집</h2></div>
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "700px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)" }}>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>요약</label><textarea name="summary" defaultValue={memory.summary ?? ""} rows={8} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>다음 질문</label><input name="carryForwardQuestion" defaultValue={memory.carryForwardQuestion ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>상태</label><select name="status" defaultValue={memory.status} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="draft">초안</option><option value="published">발행</option></select></div>
        <div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button><Link to="/admin/memories" style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text-secondary)", fontSize: "14px" }}>취소</Link></div>
      </form>
    </div>
  );
}
