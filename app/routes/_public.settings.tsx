import type { Route } from "./+types/_public.settings";
import { requireAuth } from "../lib/auth.middleware";
import { createLogger } from "../lib/logger.server";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
import { eq } from "drizzle-orm";
import HeroSection from "../components/HeroSection";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "설정 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "settings" });
  logger.info("loader_start");
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);

  const learnerResult = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);

  return { learner: learnerResult[0] ?? null };
}

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "settings" });
  const auth = await requireAuth(request, context);
  const formData = await request.formData();
  logger.info("action_start");
  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);

  const defaultVisibility = formData.get("defaultVisibility") as string | null;
  const defaultResponsePreference = formData.get(
    "defaultResponsePreference"
  ) as string | null;
  const notificationEmailEnabled = formData.get("notificationEmailEnabled") === "on";

  const changedFields: string[] = [];
  if (defaultVisibility) changedFields.push("defaultVisibility");
  if (defaultResponsePreference) changedFields.push("defaultResponsePreference");
  changedFields.push("notificationEmailEnabled");

  await database
    .update(learnerProfiles)
    .set({
      defaultVisibility: defaultVisibility ?? undefined,
      defaultResponsePreference: defaultResponsePreference ?? undefined,
      notificationEmailEnabled,
      updatedAt: now,
    })
    .where(eq(learnerProfiles.userId, auth.user.id));

  logger.info("settings_update", { fields: changedFields });

  return { success: "설정이 저장되었습니다." };
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { learner } = loaderData;

  return (
    <div>
      <HeroSection
        variant="home"
        title="설정"
        subtitle="divelog 전용 설정입니다. 이름·바이오 변경은 ada-kr-pos.com에서 합니다."
      />

      <div className="max-w-[600px] mx-auto py-12 px-4 md:py-20">
        <form method="post" className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="defaultVisibility"
              className="block text-meta font-medium text-text-secondary mb-2"
            >
              기본 공개 범위
            </label>
            <select
              id="defaultVisibility"
              name="defaultVisibility"
              defaultValue={learner?.defaultVisibility ?? "cohort"}
              className="w-full rounded-sm border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
            >
              <option value="draft">임시저장</option>
              <option value="cohort">코호트 공개</option>
              <option value="public">전체 공개</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="defaultResponsePreference"
              className="block text-meta font-medium text-text-secondary mb-2"
            >
              응답 선호도
            </label>
            <select
              id="defaultResponsePreference"
              name="defaultResponsePreference"
              defaultValue={learner?.defaultResponsePreference ?? "open"}
              className="w-full rounded-sm border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
            >
              <option value="open">모든 응답</option>
              <option value="question_only">질문만</option>
              <option value="closed">응답 닫기</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="notificationEmailEnabled"
                defaultChecked={learner?.notificationEmailEnabled ?? true}
                className="w-4 h-4 rounded border-border text-ocean-blue focus:ring-2 focus:ring-ocean-blue"
              />
              <span className="text-base text-text-primary">
                이메일 알림 받기
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-meta text-text-tertiary mb-4">
              이름·바이오 변경은 ada-kr-pos.com 계정 설정에서 합니다.
            </p>
            <button
              type="submit"
              className="bg-ocean-blue text-white rounded-md px-5 py-2.5 text-base font-medium hover:bg-deep-ocean transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
