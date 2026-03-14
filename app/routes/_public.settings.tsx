import type { Route } from "./+types/_public.settings";
import { requireAuth } from "../lib/auth.middleware";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
import { eq } from "drizzle-orm";
import HeroSection from "../components/HeroSection";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "설정 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
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
  const auth = await requireAuth(request, context);
  const formData = await request.formData();
  const database = db(context.cloudflare.env.DB);
  const now = Math.floor(Date.now() / 1000);

  const defaultVisibility = formData.get("defaultVisibility") as string | null;
  const defaultResponsePreference = formData.get(
    "defaultResponsePreference"
  ) as string | null;
  const notificationEmailEnabled = formData.get("notificationEmailEnabled") === "on";

  await database
    .update(learnerProfiles)
    .set({
      defaultVisibility: defaultVisibility ?? undefined,
      defaultResponsePreference: defaultResponsePreference ?? undefined,
      notificationEmailEnabled,
      updatedAt: now,
    })
    .where(eq(learnerProfiles.userId, auth.user.id));

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

      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        <form
          method="post"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}
        >
          <div>
            <label
              htmlFor="defaultVisibility"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              기본 공개 범위
            </label>
            <select
              id="defaultVisibility"
              name="defaultVisibility"
              defaultValue={learner?.defaultVisibility ?? "cohort"}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "var(--font-size-base)",
                backgroundColor: "var(--color-surface)",
                width: "100%",
              }}
            >
              <option value="draft">임시저장</option>
              <option value="cohort">코호트 공개</option>
              <option value="public">전체 공개</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="defaultResponsePreference"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              응답 선호도
            </label>
            <select
              id="defaultResponsePreference"
              name="defaultResponsePreference"
              defaultValue={learner?.defaultResponsePreference ?? "open"}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "var(--font-size-base)",
                backgroundColor: "var(--color-surface)",
                width: "100%",
              }}
            >
              <option value="open">모든 응답</option>
              <option value="question_only">질문만</option>
              <option value="closed">응답 닫기</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="notificationEmailEnabled"
                defaultChecked={learner?.notificationEmailEnabled ?? true}
              />
              <span
                style={{
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-primary)",
                }}
              >
                이메일 알림 받기
              </span>
            </label>
          </div>

          <div
            style={{
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-tertiary)",
                marginBottom: "var(--space-4)",
              }}
            >
              이름·바이오 변경은 ada-kr-pos.com 계정 설정에서 합니다.
            </p>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-ocean-blue)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--font-size-base)",
              }}
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
