import { data, Form, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/$stageSlug";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { stages, records, collaborationUnits, learnerProfiles } from "~/db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import HeroSection from "~/components/HeroSection";
import SceneCard from "~/components/SceneCard";
import QuestionCard from "~/components/QuestionCard";
import CollaborationUnitCard from "~/components/CollaborationUnitCard";
import EmptyState from "~/components/EmptyState";
import StageStrip from "~/components/StageStrip";
import { getPersonalReflection, upsertPersonalReflection } from "~/db/queries/reflections.server";
import { getOpenQuestionsForStage } from "~/db/queries/questions.server";
import { getOptionalUser, requireAuth } from "~/lib/auth.middleware";
import { createLogger } from "~/lib/logger.server";
import { personalReflectionSchema } from "~/lib/validation";

const cache = new Map<string, unknown>();

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { stageSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "journey_stage_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const auth = await getOptionalUser(request, context);

  const [stageResult, allStages] = await database.batch([
    database.select().from(stages).where(eq(stages.slug, stageSlug)).limit(1),
    database.select().from(stages).orderBy(sql`"order" ASC`),
  ]);

  const stage = stageResult[0];
  if (!stage) {
    logger.info("not_found", { slug: stageSlug });
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  const [stageRecords, stageCollaborations] = await database.batch([
    database
      .select({
        record: records,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(eq(records.stageId, stage.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt))
      .limit(12),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.stageId, stage.id)),
  ]);
  const stageQuestions = await getOpenQuestionsForStage(context.cloudflare.env.DB, stage.id, 5);

  const existingReflection = stage.status === "closed" && auth?.user
    ? await getPersonalReflection(context.cloudflare.env.DB, stage.id, auth.user.id)
    : null;

  logger.info("loader_end");
  return {
    stage,
    allStages,
    stageRecords,
    stageQuestions,
    stageCollaborations,
    existingReflection,
    canWriteReflection: Boolean(auth?.isAuthenticated),
  };
}

export async function clientLoader({ params, serverLoader }: {
  params: { stageSlug?: string };
  serverLoader: () => Promise<unknown>;
}) {
  const key = params.stageSlug ?? "";
  if (cache.has(key)) return cache.get(key);
  const data = await serverLoader();
  cache.set(key, data);
  return data;
}

export async function clientAction({ params, serverAction }: Route.ClientActionArgs) {
  const result = await serverAction();
  cache.delete(params.stageSlug ?? "");
  return result;
}

function normalizeOptionalField(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent !== "create_reflection" && intent !== "edit_reflection") {
    return { error: "알 수 없는 요청입니다." };
  }

  const auth = await requireAuth(request, context);
  const stageSlug = params.stageSlug;
  const database = db(context.cloudflare.env.DB);
  const stageResult = await database.select().from(stages).where(eq(stages.slug, stageSlug)).limit(1);
  const stage = stageResult[0];

  if (!stage) {
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  if (stage.status !== "closed") {
    return { error: "종료된 Stage에서만 회고를 남길 수 있습니다." };
  }

  const parsed = personalReflectionSchema.safeParse({
    stageId: formData.get("stageId"),
    letGo: normalizeOptionalField(formData.get("letGo")),
    carryQuestion: normalizeOptionalField(formData.get("carryQuestion")),
    lastingSentence: normalizeOptionalField(formData.get("lastingSentence")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  await upsertPersonalReflection(context.cloudflare.env.DB, {
    stageId: parsed.data.stageId || stage.id,
    learnerId: auth.user.id,
    letGo: parsed.data.letGo,
    carryQuestion: parsed.data.carryQuestion,
    lastingSentence: parsed.data.lastingSentence,
  });

  return { success: true };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Stage — DiveLog" }];
  }
  return [
    { title: `${loaderData.stage.name} — DiveLog` },
    {
      name: "description",
      content: loaderData.stage.description ?? `${loaderData.stage.name} Stage의 기록들`,
    },
  ];
}

export default function StageDetailPage({ loaderData }: Route.ComponentProps) {
  const { stage, allStages, stageRecords, stageQuestions, stageCollaborations, existingReflection, canWriteReflection } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmittingReflection = navigation.state === "submitting"
    && (navigation.formData?.get("intent") === "create_reflection"
      || navigation.formData?.get("intent") === "edit_reflection");
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const showReflectionForm = !existingReflection || isEditingReflection;

  return (
    <div>
      <HeroSection
        variant="stage"
        title={stage.name}
        subtitle={stage.description ?? undefined}
        accentTone={stage.type}
        badge={stage.isCurrent ? "현재 Stage" : undefined}
      />

      <div className="bg-surface border-b border-border">
        <StageStrip stages={allStages} currentStageSlug={stage.slug} />
      </div>

      <div className="max-w-content mx-auto px-6 py-16 md:py-24">
        {stage.heroContent && (
          <section className="mb-12 p-8 bg-surface rounded-lg border border-border">
            <p className="text-meta text-text-tertiary mb-3">
              이 Stage의 탐구
            </p>
            <p className="text-lg text-text-primary leading-relaxed italic">
              {stage.heroContent}
            </p>
          </section>
        )}

        {stageQuestions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              이 Stage의 열린 질문들
            </h2>
            <div className="flex flex-col gap-5">
              {stageQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  record={
                    question.recordSlug && question.recordTitle
                      ? { slug: question.recordSlug, title: question.recordTitle }
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            협업
          </h2>
          {stageCollaborations.length === 0 ? (
            <div className="p-8 bg-surface rounded-lg border border-border text-center">
              <p className="text-text-secondary">
                이 Stage는 개인 탐색 중심으로 진행됩니다.
              </p>
              <p className="text-meta text-text-tertiary mt-2">
                혼자서 탐구하는 것도 충분한 탐구입니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stageCollaborations.map((unit) => (
                <CollaborationUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">
              기록
            </h2>
            <Link
              to={`/logs?stage=${stage.id}`}
              className="text-sm text-text-tertiary hover:text-ocean-blue transition-colors no-underline"
            >
              전체 보기 →
            </Link>
          </div>
          {stageRecords.length === 0 ? (
            <EmptyState
              variant="records"
              action={{ label: "이 Stage에 기록하기", href: "/write" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stageRecords.map(({ record, author }) => (
                <SceneCard
                  key={record.id}
                  record={{
                    slug: record.slug,
                    title: record.title,
                    content: record.content,
                    format: record.format as "note" | "article",
                    type: record.type as "personal" | "challenge" | "collaboration",
                    rhythm: record.rhythm ?? undefined,
                    createdAt: record.createdAt,
                  }}
                  author={author?.displayName ? { displayName: author.displayName, slug: author.slug ?? "" } : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {stage.status === "closed" && canWriteReflection && (
          <section data-testid="personal-closing-ritual" className="mt-12 border-t border-border pt-8">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              이 구간을 돌아보며
            </h2>
            <p className="text-sm text-text-tertiary mb-6">
              완성된 글이 아니어도 괜찮습니다. 한 문장도 충분합니다.
            </p>

            {actionData?.error ? (
              <p className="mb-4 text-sm text-error">{actionData.error}</p>
            ) : null}

            {existingReflection && !showReflectionForm ? (
              <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-text-secondary">버릴 것</h3>
                  <p className="text-base leading-relaxed text-text-primary">{existingReflection.letGo || "—"}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-text-secondary">다음 구간으로 가져갈 질문</h3>
                  <p className="text-base leading-relaxed text-text-primary">{existingReflection.carryQuestion || "—"}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-text-secondary">가장 오래 남은 문장</h3>
                  <p className="text-base leading-relaxed text-text-primary">{existingReflection.lastingSentence || "—"}</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsEditingReflection(true)}
                    className="min-h-11 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                  >
                    수정
                  </button>
                </div>
              </div>
            ) : (
              <Form method="post" className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
                <input
                  type="hidden"
                  name="intent"
                  value={existingReflection ? "edit_reflection" : "create_reflection"}
                />
                <input type="hidden" name="stageId" value={stage.id} />

                <div>
                  <label htmlFor="letGo" className="mb-2 block text-sm font-medium text-text-secondary">
                    이 구간에서 버릴 것 한 가지 (선택)
                  </label>
                  <textarea
                    id="letGo"
                    name="letGo"
                    defaultValue={existingReflection?.letGo ?? ""}
                    rows={4}
                    placeholder="무엇을 내려놓을 수 있을까요?"
                    className="min-h-[96px] w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                  />
                </div>

                <div>
                  <label htmlFor="carryQuestion" className="mb-2 block text-sm font-medium text-text-secondary">
                    다음 구간으로 가져갈 질문 한 가지 (선택)
                  </label>
                  <textarea
                    id="carryQuestion"
                    name="carryQuestion"
                    defaultValue={existingReflection?.carryQuestion ?? ""}
                    rows={4}
                    placeholder="어떤 질문을 가져가고 싶은가요?"
                    className="min-h-[96px] w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                  />
                </div>

                <div>
                  <label htmlFor="lastingSentence" className="mb-2 block text-sm font-medium text-text-secondary">
                    가장 오래 남은 문장 한 가지 (선택)
                  </label>
                  <textarea
                    id="lastingSentence"
                    name="lastingSentence"
                    defaultValue={existingReflection?.lastingSentence ?? ""}
                    rows={4}
                    placeholder="이 구간에서 떠오르는 문장은?"
                    className="min-h-[96px] w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReflection}
                  className="self-start rounded-full bg-deep-ocean px-7 py-3 text-[15px] font-medium text-white shadow-sm transition-all hover:bg-ocean-blue hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {isSubmittingReflection ? "저장 중..." : "저장"}
                </button>
              </Form>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">
        Stage를 찾을 수 없습니다
      </p>
      <p className="mt-2 text-text-secondary">
        요청하신 Stage가 존재하지 않습니다.
      </p>
      <Link
        to="/journey"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        여정으로 돌아가기
      </Link>
    </div>
  );
}
