import type { Route } from "./+types/settings";
import { requireAuth } from "~/lib/auth.middleware";
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
  const { createLogger } = await import("~/lib/logger.server");
  const { db } = await import("~/db/client.server");
  const { learnerProfiles } = await import("~/db/schema.server");

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
  const { createLogger } = await import("~/lib/logger.server");
  const { db } = await import("~/db/client.server");
  const { learnerProfiles } = await import("~/db/schema.server");

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
        subtitle="DiveLog 활동을 위한 기본 설정을 관리합니다."
      />

      <div className="max-w-[720px] mx-auto py-12 px-6 md:py-20">
        <form method="post" className="flex flex-col gap-12">
          
          <section>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6 pb-4 border-b border-border">
              계정 정보
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium text-text-primary">
                  이름 및 바이오
                </Label>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-secondary border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface border border-border">
                      {learner?.profilePhotoUrl ? (
                        <img src={learner.profilePhotoUrl} alt={learner.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-tertiary font-medium">
                          {(learner?.displayName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-medium text-text-primary">{learner?.displayName}</p>
                      {learner?.bio && <p className="text-sm text-text-secondary">{learner.bio}</p>}
                    </div>
                  </div>
                  <a 
                    href="https://ada-kr-pos.com/settings/profile" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-medium text-ocean-blue hover:text-ocean-blue/80 transition-colors px-3 py-1.5 rounded-lg border border-border bg-surface"
                  >
                    ada-kr-pos.com에서 편집 ↗
                  </a>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  DiveLog의 계정 정보는 통합 계정 서비스에서 관리됩니다.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6 pb-4 border-b border-border">
              기록 설정
            </h2>
            <div className="space-y-8">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="defaultVisibility"
                  className="text-base font-medium text-text-primary"
                >
                  새 기록 기본 공개 범위
                </Label>
                <p className="text-sm text-text-secondary mb-1">
                  새로운 기록을 작성할 때 기본으로 선택될 공개 범위를 설정합니다. 작성 시 언제든 변경할 수 있습니다.
                </p>
                <Select name="defaultVisibility" defaultValue={learner?.defaultVisibility ?? "cohort"}>
                  <SelectTrigger id="defaultVisibility" className="w-full max-w-sm bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">임시저장 (나만 보기)</SelectItem>
                    <SelectItem value="cohort">코호트 공개</SelectItem>
                    <SelectItem value="public">전체 공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="defaultResponsePreference"
                  className="text-base font-medium text-text-primary"
                >
                  기본 응답 선호도
                </Label>
                <p className="text-sm text-text-secondary mb-1">
                  다른 Learner가 내 기록에 어떤 종류의 응답을 남길 수 있을지 기본값을 설정합니다.
                </p>
                <Select name="defaultResponsePreference" defaultValue={learner?.defaultResponsePreference ?? "open"}>
                  <SelectTrigger id="defaultResponsePreference" className="w-full max-w-sm bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">모든 응답 허용 (공명, 질문, 연결, 제안)</SelectItem>
                    <SelectItem value="question_only">질문과 공명만 허용</SelectItem>
                    <SelectItem value="closed">응답 닫기</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6 pb-4 border-b border-border">
              알림 설정
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-secondary/50">
                <Checkbox
                  id="notificationEmailEnabled"
                  name="notificationEmailEnabled"
                  defaultChecked={learner?.notificationEmailEnabled ?? true}
                  className="mt-1 border-border data-[state=checked]:border-ocean-blue data-[state=checked]:bg-ocean-blue"
                />
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="notificationEmailEnabled"
                    className="cursor-pointer text-base font-medium text-text-primary"
                  >
                    이메일 알림 받기
                  </Label>
                  <p className="text-sm text-text-secondary">
                    내 기록에 남겨진 질문과 공명, 그리고 멘토의 피드백을 이메일로 받아봅니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-8 flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="bg-text-primary text-white hover:bg-text-primary/90 text-base font-medium px-8 rounded-full"
            >
              변경사항 저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
