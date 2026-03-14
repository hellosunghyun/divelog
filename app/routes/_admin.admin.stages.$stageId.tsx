import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.stages.$stageId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const stage = await db(context.cloudflare.env.DB).select().from(stages).where(eq(stages.id, params.stageId)).limit(1);
  if (!stage[0]) throw data("Stage not found", { status: 404 });
  return { stage: stage[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(stages).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, status: f.get("status") as string, isCurrent: f.get("isCurrent") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(stages.id, params.stageId));
  throw redirect("/admin/stages");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Stage 편집" }]; }
export default function AdminStageEditPage({ loaderData }: Route.ComponentProps) {
  const { stage } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/stages" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← Stage 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>Stage 편집</h2></div>
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)" }}>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>이름</label><input name="name" defaultValue={stage.name} required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>설명</label><textarea name="description" defaultValue={stage.description ?? ""} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>상태</label><select name="status" defaultValue={stage.status} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="upcoming">예정</option><option value="active">진행 중</option><option value="completed">완료</option></select></div>
        <div><label style={{ display: "flex", gap: "8px", cursor: "pointer", fontSize: "14px" }}><input type="checkbox" name="isCurrent" defaultChecked={stage.isCurrent ?? false} />현재 Stage로 설정</label></div>
        <div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button><Link to="/admin/stages" style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text-secondary)", fontSize: "14px" }}>취소</Link></div>
      </form>
    </div>
  );
}
