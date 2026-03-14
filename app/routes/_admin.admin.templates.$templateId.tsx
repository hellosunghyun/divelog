import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.templates.$templateId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { templates } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const tmpl = await db(context.cloudflare.env.DB).select().from(templates).where(eq(templates.id, params.templateId)).limit(1);
  if (!tmpl[0]) throw data("Template not found", { status: 404 });
  return { template: tmpl[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(templates).set({ name: f.get("name") as string, description: (f.get("description") as string) || null, promptBody: (f.get("promptBody") as string) || null, context: (f.get("ctx") as string) || null, form: (f.get("form") as string) || null, rhythm: (f.get("rhythm") as string) || null, active: f.get("active") === "on", updatedAt: Math.floor(Date.now() / 1000) }).where(eq(templates.id, params.templateId));
  throw redirect("/admin/templates");
}
export function meta(_: Route.MetaArgs) { return [{ title: "템플릿 편집" }]; }
export default function AdminTemplateEditPage({ loaderData }: Route.ComponentProps) {
  const { template } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/templates" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>템플릿 편집</h2></div>
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "700px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)" }}>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>이름</label><input name="name" defaultValue={template.name} required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>설명</label><input name="description" defaultValue={template.description ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>프롬프트 본문</label><textarea name="promptBody" defaultValue={template.promptBody ?? ""} rows={6} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>유형</label><select name="ctx" defaultValue={template.context ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="">전체</option><option value="personal">개인</option><option value="challenge">챌린지</option><option value="collaboration">협업</option></select></div>
          <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>형식</label><select name="form" defaultValue={template.form ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="">전체</option><option value="note">노트</option><option value="article">글</option></select></div>
          <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>리듬</label><select name="rhythm" defaultValue={template.rhythm ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="">전체</option><option value="sprint">스프린트</option><option value="weekly">주간</option><option value="monthly">월간</option><option value="free">자유</option></select></div>
        </div>
        <div><label style={{ display: "flex", gap: "8px", cursor: "pointer", fontSize: "14px" }}><input type="checkbox" name="active" defaultChecked={template.active ?? true} />활성화</label></div>
        <div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button><Link to="/admin/templates" style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text-secondary)", fontSize: "14px" }}>취소</Link></div>
      </form>
    </div>
  );
}
