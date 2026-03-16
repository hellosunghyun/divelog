import { redirect } from "react-router";
import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { settings } from "~/db/schema.server";
import { eq } from "drizzle-orm";

type SettingRow = typeof settings.$inferSelect;

export function meta(_: Route.MetaArgs) { return [{ title: "시스템 설정" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.settings" });
  logger.info("loader_start");
  return { settings: await db(context.cloudflare.env.DB).select().from(settings) };
}
export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.settings" });
  const f = await request.formData();
  logger.info("action_start", { intent: "update_settings" });
  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);
  const keys = ["home_show_scenes", "home_show_questions", "home_show_sentences", "home_show_learners", "search_enabled"];
  const changedKeys: string[] = [];
  for (const key of keys) {
    const value = f.get(key) === "on" ? "true" : "false";
    changedKeys.push(key);
    await database.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key));
  }
  logger.info("admin_update_settings", { changedKeys });
  throw redirect("/admin/settings");
}
export default function AdminSettingsPage({ loaderData }: Route.ComponentProps) {
  const { settings: allSettings } = loaderData;
  const getVal = (key: string) => allSettings.find((s: SettingRow) => s.key === key)?.value === "true";
  const BOOL_SETTINGS = [
    { key: "home_show_scenes", label: "홈 — 최근 기록 표시" },
    { key: "home_show_questions", label: "홈 — 열린 질문 표시" },
    { key: "home_show_sentences", label: "홈 — 문장 표시" },
    { key: "home_show_learners", label: "홈 — 러너 스포트라이트" },
    { key: "search_enabled", label: "검색 활성화" },
  ];
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">시스템 설정</h2>
      <form method="post" className="max-w-[500px] bg-admin-surface rounded-md p-6 border border-admin-border flex flex-col gap-4">
        {BOOL_SETTINGS.map((s) => (
          <div key={s.key}>
            <div className="flex items-center gap-3">
              <Checkbox id={s.key} name={s.key} defaultChecked={getVal(s.key)} className="border-admin-border data-[state=checked]:border-admin-accent data-[state=checked]:bg-admin-accent" />
              <Label htmlFor={s.key} className="cursor-pointer text-sm font-normal text-admin-text">{s.label}</Label>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-admin-border">
          <Button type="submit" className="rounded-md bg-admin-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90">저장</Button>
        </div>
      </form>
    </div>
  );
}
