import { redirect } from "react-router";
import type { Route } from "./+types/settings";
import { eq } from "drizzle-orm";
import {
  adminCardClass,
  adminCardHeaderClass,
  adminCardBodyClass,
  adminCardFooterClass,
  adminBtnPrimary,
  adminHelperClass,
} from "~/components/admin/admin-patterns";

type SettingRow = typeof settings.$inferSelect;

export function meta(_: Route.MetaArgs) {
  return [{ title: "시스템 설정" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { settings } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.settings" });
  logger.info("loader_start");
  return { settings: await db(context.cloudflare.env.DB).select().from(settings) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { settings } = await import("~/db/schema.server");

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

  const SETTING_GROUPS = [
    {
      title: "홈 화면",
      description: "홈 화면에 표시할 섹션을 선택하세요",
      settings: [
        { key: "home_show_scenes", label: "최근 기록", helper: "홈 화면에 최근 기록을 표시합니다" },
        { key: "home_show_questions", label: "열린 질문", helper: "홈 화면에 열린 질문을 표시합니다" },
        { key: "home_show_sentences", label: "문장", helper: "홈 화면에 하이라이트 문장을 표시합니다" },
        { key: "home_show_learners", label: "러너 스포트라이트", helper: "홈 화면에 러너 프로필을 표시합니다" },
      ],
    },
    {
      title: "기능",
      description: "사이트 전체 기능 설정",
      settings: [
        { key: "search_enabled", label: "검색 활성화", helper: "사이트 내 검색 기능을 활성화합니다" },
      ],
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">시스템 설정</h2>

      <form method="post" className="space-y-6 max-w-2xl">
        {SETTING_GROUPS.map((group) => (
          <div key={group.title} className={adminCardClass}>
            <div className={adminCardHeaderClass}>
              <div>
                <h3 className="text-sm font-semibold text-admin-text">{group.title}</h3>
                <p className="text-caption text-admin-text-secondary mt-0.5">{group.description}</p>
              </div>
            </div>
            <div className={adminCardBodyClass}>
              <div className="space-y-4">
                {group.settings.map((s) => (
                  <label
                    key={s.key}
                    htmlFor={s.key}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        id={s.key}
                        name={s.key}
                        defaultChecked={getVal(s.key)}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-admin-bg border border-admin-border rounded-full peer-checked:bg-admin-accent peer-checked:border-admin-accent transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-admin-text group-hover:text-admin-accent transition-colors">
                        {s.label}
                      </span>
                      <p className={adminHelperClass}>{s.helper}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className={adminCardClass}>
          <div className={adminCardFooterClass}>
            <button type="submit" className={adminBtnPrimary}>
              설정 저장
            </button>
          </div>
        </div>
      </form>

      <div className={`${adminCardClass} mt-8 max-w-2xl`}>
        <div className={adminCardHeaderClass}>
          <h3 className="text-sm font-semibold text-admin-text">시스템 정보</h3>
        </div>
        <div className={adminCardBodyClass}>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-admin-border">
              <span className="text-caption text-admin-text-secondary">버전</span>
              <span className="text-caption font-mono text-admin-text">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-admin-border">
              <span className="text-caption text-admin-text-secondary">프레임워크</span>
              <span className="text-caption text-admin-text">React Router 7</span>
            </div>
            <div className="flex justify-between py-2 border-b border-admin-border">
              <span className="text-caption text-admin-text-secondary">데이터베이스</span>
              <span className="text-caption text-admin-text">Cloudflare D1</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-caption text-admin-text-secondary">호스팅</span>
              <span className="text-caption text-admin-text">Cloudflare Pages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
