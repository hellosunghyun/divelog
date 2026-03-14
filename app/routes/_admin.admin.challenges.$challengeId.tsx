import { data, redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.challenges.$challengeId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges } from "../db/schema.server";
import { eq } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const ch = await db(context.cloudflare.env.DB).select().from(challenges).where(eq(challenges.id, params.challengeId)).limit(1);
  if (!ch[0]) throw data("Challenge not found", { status: 404 });
  return { challenge: ch[0] };
}
export async function action({ params, request, context }: Route.ActionArgs) {
  const f = await request.formData();
  await db(context.cloudflare.env.DB).update(challenges).set({ name: f.get("name") as string, problemDefinition: (f.get("problemDefinition") as string) || null, currentQuestion: (f.get("currentQuestion") as string) || null, status: f.get("status") as string, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(challenges.id, params.challengeId));
  throw redirect("/admin/challenges");
}
export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 편집" }]; }
export default function AdminChallengeEditPage({ loaderData }: Route.ComponentProps) {
  const { challenge } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/challenges" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>챌린지 편집</h2></div>
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)" }}>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>이름</label><input name="name" defaultValue={challenge.name} required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>문제 정의</label><textarea name="problemDefinition" defaultValue={challenge.problemDefinition ?? ""} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>현재 질문</label><input name="currentQuestion" defaultValue={challenge.currentQuestion ?? ""} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px", fontFamily: "inherit" }} /></div>
        <div><label style={{ display: "block", fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "6px" }}>상태</label><select name="status" defaultValue={challenge.status} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", fontSize: "14px" }}><option value="active">진행 중</option><option value="completed">완료</option><option value="archived">아카이브</option></select></div>
        <div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button><Link to="/admin/challenges" style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid var(--color-admin-border)", color: "var(--color-admin-text-secondary)", fontSize: "14px" }}>취소</Link></div>
      </form>
    </div>
  );
}
