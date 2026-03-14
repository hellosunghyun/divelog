import { redirect } from "react-router";
import type { Route } from "./+types/_admin.admin.settings";
import { db } from "../db/client.server";
import { settings } from "../db/schema.server";
import { eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "시스템 설정" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { settings: await db(context.cloudflare.env.DB).select().from(settings) };
}
export async function action({ request, context }: Route.ActionArgs) {
  const f = await request.formData();
  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);
  const keys = ["home_show_scenes", "home_show_questions", "home_show_sentences", "home_show_learners", "search_enabled"];
  for (const key of keys) {
    const value = f.get(key) === "on" ? "true" : "false";
    await database.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key));
  }
  throw redirect("/admin/settings");
}
export default function AdminSettingsPage({ loaderData }: Route.ComponentProps) {
  const { settings: allSettings } = loaderData;
  const getVal = (key: string) => allSettings.find((s) => s.key === key)?.value === "true";
  const BOOL_SETTINGS = [
    { key: "home_show_scenes", label: "홈 — 최근 기록 표시" },
    { key: "home_show_questions", label: "홈 — 열린 질문 표시" },
    { key: "home_show_sentences", label: "홈 — 문장 표시" },
    { key: "home_show_learners", label: "홈 — Learner Spotlight" },
    { key: "search_enabled", label: "검색 활성화" },
  ];
  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>시스템 설정</h2>
      <form method="post" style={{ maxWidth: "500px", backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "24px", border: "1px solid var(--color-admin-border)", display: "flex", flexDirection: "column", gap: "16px" }}>
        {BOOL_SETTINGS.map((s) => (
          <div key={s.key}><label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "var(--color-admin-text)" }}><input type="checkbox" name={s.key} defaultChecked={getVal(s.key)} />{s.label}</label></div>
        ))}
        <div style={{ paddingTop: "8px", borderTop: "1px solid var(--color-admin-border)" }}><button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "var(--color-admin-accent)", color: "white", border: "none", cursor: "pointer", fontSize: "14px" }}>저장</button></div>
      </form>
    </div>
  );
}
