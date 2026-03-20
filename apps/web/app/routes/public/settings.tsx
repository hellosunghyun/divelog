import type { Route } from "./+types/settings";
import { requireAuth } from "~/lib/auth/auth.middleware.server";
import { eq } from "drizzle-orm";
import { useActionData } from "react-router";
import { Form } from "react-router";
import HeroSection from "~/components/sections/HeroSection";
import { Button } from "~/components/ui/button";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/client.server";
import { clearAllReads } from "~/db/queries/records/recordReads.server";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "~/db/queries/social/notificationPreferences.server";
import { learnerProfiles } from "~/db/schema.server";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "~/lib/constants/notificationTypes";
import { clearLocalReads } from "~/lib/infra/read-storage";
import { createLogger } from "~/lib/infra/logger.server";

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { title: string; description: string }> = {
  response: {
    title: "응답 알림",
    description: "내 기록에 공명, 질문, 연결, 제안이 남겨지면 알림을 받습니다.",
  },
  reply: {
    title: "답글 알림",
    description: "내 질문이나 응답에 답글이 달리면 알림을 받습니다.",
  },
  mention: {
    title: "멘션 알림",
    description: "다른 글에서 내가 멘션되면 알림을 받습니다.",
  },
  participant_added: {
    title: "참가자 추가 알림",
    description: "협업에 새 참가자가 추가되면 알림을 받습니다.",
  },
  reminder: {
    title: "리마인더 알림",
    description: "설정한 리마인더 시간에 알림을 받습니다.",
  },
  reread_reminder: {
    title: "다시 읽기 리마인더",
    description: "다시 읽고 싶다고 표시한 기록을 상기시켜 주는 알림을 받습니다.",
  },
  stage_transition: {
    title: "스테이지 전환 알림",
    description: "여정의 새로운 스테이지가 시작되면 알림을 받습니다.",
  },
};

export function meta(_args: Route.MetaArgs) {
  return [{ title: "설정 — DiveLog" }];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
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

  const learner = learnerResult[0] ?? null;

  const notificationTypePreferences = await getNotificationPreferences(
    context.cloudflare.env.DB,
    auth.user.id
  );

  return { learner, notificationTypePreferences };
}

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "settings" });
  const auth = await requireAuth(request, context);
  const formData = await request.formData();
  logger.info("action_start");
  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);

  // Intent-based dispatch
  const intent = formData.get("intent");
  if (intent === "reset_all_reads") {
    await clearAllReads(context.cloudflare.env.DB, auth.user.id);
    logger.info("reads_reset");
    return { readReset: "읽음 상태가 초기화되었습니다." };
  }

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

  const notificationTypePrefs: Partial<Record<NotificationType, boolean>> = {};
  for (const type of NOTIFICATION_TYPES) {
    notificationTypePrefs[type] = formData.get(`notif_${type}`) === "on";
  }
  await upsertNotificationPreferences(
    context.cloudflare.env.DB,
    auth.user.id,
    notificationTypePrefs
  );

  logger.info("settings_update", { fields: changedFields });

  return { success: "설정이 저장되었습니다." };
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { learner, notificationTypePreferences } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <HeroSection
        variant="home"
        title="설정"
        subtitle="DiveLog 활동을 위한 기본 설정을 관리합니다."
      />

       <div className="max-w-[720px] mx-auto py-12 px-6 md:py-20">
         <form method="post" className="flex flex-col gap-12">
           <input type="hidden" name="intent" value="update_preferences" />
           
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
                <Select name="defaultVisibility" defaultValue={learner?.defaultVisibility ?? "public"}>
                  <SelectTrigger id="defaultVisibility" className="w-full max-w-sm bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">임시저장</SelectItem>
                    <SelectItem value="private">나만 보기</SelectItem>
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

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-4">
                  알림을 받을 유형을 선택할 수 있습니다.
                </p>
                <div className="space-y-3">
                  {NOTIFICATION_TYPES.map((type) => {
                    const label = NOTIFICATION_TYPE_LABELS[type];
                    return (
                      <div
                        key={type}
                        className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-secondary/50"
                      >
                        <Checkbox
                          id={`notif_${type}`}
                          name={`notif_${type}`}
                          defaultChecked={notificationTypePreferences[type]}
                          className="mt-1 border-border data-[state=checked]:border-ocean-blue data-[state=checked]:bg-ocean-blue"
                        />
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={`notif_${type}`}
                            className="cursor-pointer text-base font-medium text-text-primary"
                          >
                            {label.title}
                          </Label>
                          <p className="text-sm text-text-secondary">
                            {label.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

           <div className="pt-8 flex justify-end">
             <SubmitButton
               size="lg"
               formDataMatch={{ intent: "update_preferences" }}
               loadingText="저장 중..."
               className="bg-text-primary text-white hover:bg-text-primary/90 text-base font-medium px-8 rounded-full"
             >
               변경사항 저장
             </SubmitButton>
           </div>
        </form>

        {/* 읽음 상태 섹션 */}
        <section className="mt-12 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">읽음 상태</h2>
          <p className="text-text-secondary text-base mb-5">
            읽은 기록의 표시를 초기화합니다.
          </p>
          {actionData && "readReset" in actionData ? (
            <p className="text-green-600 text-sm mb-4">{actionData.readReset}</p>
          ) : null}
           <Form
             method="post"
             onSubmit={() => {
               clearLocalReads();
             }}
           >
             <input type="hidden" name="intent" value="reset_all_reads" />
             <SubmitButton
               variant="outline"
               size="sm"
               formDataMatch={{ intent: "reset_all_reads" }}
               loadingText="초기화 중..."
             >
               모두 읽지 않음으로 표시
             </SubmitButton>
           </Form>
        </section>
      </div>
    </div>
  );
}
