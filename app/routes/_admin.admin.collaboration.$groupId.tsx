import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.collaboration.$groupId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collaborationUnits } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const unit = await db(context.cloudflare.env.DB).select().from(collaborationUnits).where(eq(collaborationUnits.id, params.groupId)).limit(1);
  if (!unit[0]) throw data("Collaboration unit not found", { status: 404 });
  return { unit: unit[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(collaborationUnits).set({ status: f.get("status") as string, currentQuestion: (f.get("currentQuestion") as string) || null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(collaborationUnits.id, params.groupId));
  throw redirect("/admin/collaboration");
}
export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export default function AdminCollaborationDetailPage({ loaderData }: Route.ComponentProps) {
  const { unit } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/collaboration" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>{unit.name}</h2></div>
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)" }}>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>상태</label><select name="status" defaultValue={unit.status} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="forming">구성 중</option><option value="active">탐구 중</option><option value="restructured">재편성됨</option><option value="archived">아카이브</option></select></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>현재 질문</label><input name="currentQuestion" defaultValue={unit.currentQuestion ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button><Link to="/admin/collaboration" style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text-secondary)", fontSize: "14px" }}>취소</Link></div>
      </form>
    </div>
  );
}
