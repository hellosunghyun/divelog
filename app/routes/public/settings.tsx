import type { Route } from "./+types/settings";
import { requireAuth } from "~/lib/auth.middleware";
import { createLogger } from "~/lib/logger.server";
import { db } from "~/db/client.server";
import { learnerProfiles } from "~/db/schema.server";
import { eq } from "drizzle-orm";
import HeroSection from "~/components/HeroSection";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "설정 — DiveLog" }];
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
            <Label
              htmlFor="defaultVisibility"
              className="mb-2 block text-meta font-medium text-text-secondary"
            >
              기본 공개 범위
            </Label>
            <Select
              name="defaultVisibility"
              defaultValue={learner?.defaultVisibility ?? "cohort"}
            >
              <SelectTrigger
                id="defaultVisibility"
                className="w-full rounded-sm border-border bg-surface text-base shadow-none focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="cohort">코호트 공개</SelectItem>
                <SelectItem value="public">전체 공개</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              htmlFor="defaultResponsePreference"
              className="mb-2 block text-meta font-medium text-text-secondary"
            >
              응답 선호도
            </Label>
            <Select
              name="defaultResponsePreference"
              defaultValue={learner?.defaultResponsePreference ?? "open"}
            >
              <SelectTrigger
                id="defaultResponsePreference"
                className="w-full rounded-sm border-border bg-surface text-base shadow-none focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">모든 응답</SelectItem>
                <SelectItem value="question_only">질문만</SelectItem>
                <SelectItem value="closed">응답 닫기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="notificationEmailEnabled"
                name="notificationEmailEnabled"
                defaultChecked={learner?.notificationEmailEnabled ?? true}
                className="border-border data-[state=checked]:border-ocean-blue data-[state=checked]:bg-ocean-blue"
              />
              <Label
                htmlFor="notificationEmailEnabled"
                className="cursor-pointer text-base font-normal text-text-primary"
              >
                이메일 알림 받기
              </Label>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-meta text-text-tertiary mb-4">
              이름·바이오 변경은 ada-kr-pos.com 계정 설정에서 합니다.
            </p>
            <Button
              type="submit"
              className="bg-ocean-blue text-base font-medium text-white hover:bg-deep-ocean"
            >
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
