import { useState } from "react";
import type { Route } from "./+types/me";
import { requireAuth } from "~/lib/auth/auth.middleware";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import SceneCard from "~/components/cards/SceneCard";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import QuestionCard from "~/components/cards/QuestionCard";
import ResponseCard from "~/components/cards/ResponseCard";
import EmptyState from "~/components/feedback/EmptyState";
import { Link } from "~/components/content/SmartLink";
import { db } from "~/db/client.server";
import { getResponsesByAuthor } from "~/db/queries/dialogue/responses.server";
import { getSavedRecordsWithDetails } from "~/db/queries/records/savedRecords.server";
import { drafts, learnerProfiles, questions, records, sentences, stages } from "~/db/schema.server";
import { getPlainText } from "~/lib/content/content.server";
import { createLogger } from "~/lib/infra/logger.server";
import { cn } from "~/lib/utils/cn";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "내 공간 — DiveLog" }];
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

const STAGE_TONE_MAP: Record<string, { bg: string; border: string; label: string }> = {
  prelude: { bg: "var(--color-prelude-bg)", border: "var(--color-prelude)", label: "전주" },
  bridge: { bg: "var(--color-bridge-bg)", border: "var(--color-bridge)", label: "연결" },
  challenge: { bg: "var(--color-challenge-bg)", border: "var(--color-challenge)", label: "도전" },
  epilogue: { bg: "var(--color-epilogue-bg)", border: "var(--color-epilogue)", label: "에필로그" },
};

function getStageToneStyle(stageType: string) {
  return STAGE_TONE_MAP[stageType] ?? STAGE_TONE_MAP.prelude;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "me" });
  logger.info("loader_start");
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);

  const [draftRecords, autosaveDrafts, mySentences, myQuestions, unansweredQuestions, allStages, myRecordsWithStage] = await database.batch([
    database
      .select({ record: records })
      .from(records)
      .where(and(eq(records.authorId, auth.user.id), eq(records.visibility, "draft")))
      .orderBy(desc(records.updatedAt))
      .limit(5),
    database
      .select()
      .from(drafts)
      .where(eq(drafts.authorId, auth.user.id))
      .orderBy(desc(drafts.updatedAt)),
    database
      .select({ sentence: sentences })
      .from(sentences)
      .where(eq(sentences.savedById, auth.user.id))
      .orderBy(desc(sentences.createdAt))
      .limit(6),
    database
      .select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .where(
        and(eq(records.authorId, auth.user.id), eq(questions.isOpen, true))
      )
      .orderBy(desc(questions.createdAt))
      .limit(20),
    database
      .select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .where(
        and(
          eq(records.authorId, auth.user.id),
          eq(questions.isOpen, true),
          sql`NOT EXISTS (SELECT 1 FROM self_answers WHERE self_answers.question_id = ${questions.id})`
        )
      )
      .limit(20),
    database
      .select()
      .from(stages)
      .orderBy(asc(stages.order)),
    database
      .select({
        record: records,
        stageId: records.stageId,
        stageName: stages.name,
        stageType: stages.type,
        stageSlug: stages.slug,
      })
      .from(records)
      .leftJoin(stages, eq(records.stageId, stages.id))
      .where(and(eq(records.authorId, auth.user.id), sql`${records.visibility} IN ('private', 'cohort', 'public')`))
      .orderBy(desc(records.createdAt)),
  ]);

  const learnerResult = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);

  const [myResponses, mySavedRecords] = await Promise.all([
    getResponsesByAuthor(context.cloudflare.env.DB, auth.user.id),
    getSavedRecordsWithDetails(context.cloudflare.env.DB, auth.user.id),
  ]);

  const recordsByStage: Record<string, typeof myRecordsWithStage> = {};
  for (const row of myRecordsWithStage) {
    const stageId = row.stageId ?? "no-stage";
    if (!recordsByStage[stageId]) {
      recordsByStage[stageId] = [];
    }
    recordsByStage[stageId].push(row);
  }

  const autosaveDraftsWithPreview = autosaveDrafts.map((draft) => ({
    ...draft,
    preview: getPlainText(draft.content, draft.format as "note" | "article").slice(0, 200),
  }));

  logger.info("loader_end");
  return {
    learner: learnerResult[0] ?? null,
    draftRecords,
    autosaveDrafts: autosaveDraftsWithPreview,
    mySentences,
    myQuestions,
    unansweredQuestions,
    myResponses,
    mySavedRecords,
    stages: allStages,
    recordsByStage,
  };
}

export default function MySpacePage({ loaderData }: Route.ComponentProps) {
  const { learner, draftRecords, autosaveDrafts, mySentences, myQuestions, unansweredQuestions, myResponses, mySavedRecords, stages, recordsByStage } = loaderData;
  const [activeTab, setActiveTab] = useState<"records" | "questions" | "responses" | "saved">("records");

  return (
    <div>
      <div className="bg-surface border-b border-border">
        <div className="max-w-content mx-auto px-6 py-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-secondary border border-border mb-4">
            {learner?.profilePhotoUrl ? (
              <img src={learner.profilePhotoUrl} alt={learner.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-tertiary text-2xl font-medium">
                {(learner?.displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">
            {learner?.displayName ?? "내 공간"}
          </h1>
          {learner?.bio && (
            <p className="text-base text-text-secondary max-w-[600px] mb-4">
              {learner.bio}
            </p>
          )}
          <div className="flex gap-2 items-center">
            {learner?.cohort && (
              <span className="inline-flex items-center rounded-full bg-surface-secondary px-3 py-1 text-sm font-medium text-text-secondary border border-border">
                {learner.cohort}
              </span>
            )}
            <Link to="/settings" className="inline-flex items-center rounded-full bg-surface-secondary px-3 py-1 text-sm font-medium text-text-secondary border border-border hover:bg-border/50 transition-colors no-underline">
              설정
            </Link>
          </div>
        </div>
        
        <div className="max-w-content mx-auto px-6">
          <div className="flex gap-8 border-b border-transparent">
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={cn(
                "pb-4 text-base font-medium transition-colors relative",
                activeTab === "records" ? "text-ocean-blue" : "text-text-secondary hover:text-text-primary"
              )}
            >
              내 기록
              {activeTab === "records" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-ocean-blue" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={cn(
                "pb-4 text-base font-medium transition-colors relative",
                activeTab === "questions" ? "text-ocean-blue" : "text-text-secondary hover:text-text-primary"
              )}
            >
              내 질문
              {activeTab === "questions" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-ocean-blue" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("responses")}
              className={cn(
                "pb-4 text-base font-medium transition-colors relative",
                activeTab === "responses" ? "text-ocean-blue" : "text-text-secondary hover:text-text-primary"
              )}
            >
              내 응답
              {activeTab === "responses" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-ocean-blue" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={cn(
                "pb-4 text-base font-medium transition-colors relative",
                activeTab === "saved" ? "text-ocean-blue" : "text-text-secondary hover:text-text-primary"
              )}
            >
              저장한 기록
              {activeTab === "saved" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-ocean-blue" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto py-12 px-6 md:py-16">
        {activeTab === "records" && (
          <div className="space-y-16">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                  나의 여정
                </h2>
                <Link to="/write" className="text-sm font-medium text-ocean-blue hover:text-ocean-blue/80 transition-colors no-underline">
                  + 새 기록
                </Link>
              </div>
              <div className="flex flex-col gap-6">
                {(recordsByStage["no-stage"]?.length ?? 0) > 0 && (
                  <div
                    className="rounded-2xl border p-6"
                    style={{
                      backgroundColor: "var(--color-surface-secondary)",
                      borderColor: "var(--color-border)",
                      borderLeftWidth: "4px",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                        구간 미지정
                      </h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      {recordsByStage["no-stage"].map(({ record }) => (
                        <Link
                          key={record.id}
                          to={`/logs/${record.slug}`}
                          className="block p-4 rounded-xl bg-surface border border-border-subtle hover:border-border transition-colors no-underline"
                        >
                          <h4 className="text-base font-medium text-text-primary mb-1">
                            {record.title}
                          </h4>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {record.contentText?.substring(0, 100) ?? record.content.substring(0, 100)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {stages.map((stage) => {
                  const stageRecords = recordsByStage[stage.id] ?? [];
                  if (stageRecords.length === 0) return null;
                  
                  const toneStyle = getStageToneStyle(stage.type);
                  
                  return (
                    <div
                      key={stage.id}
                      className="rounded-2xl border p-6"
                      style={{
                        backgroundColor: toneStyle.bg,
                        borderColor: toneStyle.border,
                        borderLeftWidth: "4px",
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                          {stage.name}
                        </h3>
                        <span className="text-caption text-text-tertiary">
                          {toneStyle.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stageRecords.map(({ record }) => (
                          <div key={record.id} className="relative">
                            <SceneCard
                              record={{
                                slug: record.slug,
                                title: record.title,
                                content: record.content,
                                format: record.format as "note" | "article",
                                type: record.type as "personal" | "challenge" | "collaboration",
                                rhythm: record.rhythm ?? undefined,
                                createdAt: record.createdAt,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(recordsByStage).length === 0 && (
                  <EmptyState variant="records" message="아직 작성한 기록이 없습니다. 첫 번째 기록을 남겨보세요." />
                )}
              </div>
            </section>

            {(draftRecords.length > 0 || autosaveDrafts.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                    임시저장
                  </h2>
                </div>
                <div className="flex flex-col gap-5">
                  {autosaveDrafts.map((draft) => (
                    <Link
                      key={draft.id}
                      to={`/write/${draft.format}`}
                      className="block p-5 rounded-2xl bg-mist-blue/30 border border-mist-blue hover:border-ocean-blue/40 transition-colors no-underline"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-ocean-blue/10 px-2.5 py-0.5 text-xs font-medium text-ocean-blue">
                          자동저장 · {draft.format === "note" ? "짧은 메모" : "글"}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {new Date(draft.updatedAt * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {draft.title && (
                        <p className="text-base font-medium text-text-primary mb-1">{draft.title}</p>
                      )}
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {draft.preview || "작성 중인 내용이 있습니다"}
                      </p>
                    </Link>
                  ))}
                  {draftRecords.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {draftRecords.map(({ record }) => (
                        <div key={record.id} className="relative group">
                          <SceneCard
                            record={{
                              slug: record.slug,
                              title: record.title,
                              content: record.content,
                              format: record.format as "note" | "article",
                              type: record.type as "personal" | "challenge" | "collaboration",
                              rhythm: record.rhythm ?? undefined,
                              createdAt: record.createdAt,
                            }}
                          />
                          <div className="absolute inset-0 bg-surface/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Link
                              to={`/logs/${record.slug}/edit`}
                              className="px-4 py-2 rounded-full bg-ocean-blue text-white font-medium no-underline shadow-sm hover:bg-deep-ocean transition-colors"
                            >
                              이어 쓰기
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {mySentences.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
                  저장한 문장들
                </h2>
                <div className="flex flex-col gap-4">
                  {mySentences.map(({ sentence }) => (
                    <HighlightedSentenceCard key={sentence.id} sentence={sentence} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "questions" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
                미답변 질문들
              </h2>
              {unansweredQuestions.length === 0 ? (
                <EmptyState variant="questions" message="아직 답하지 않은 질문이 없습니다. 기록에 남겨둔 질문들은 나중에 언제든 스스로 답해볼 수 있습니다." />
              ) : (
                <div className="flex flex-col gap-5">
                  {unansweredQuestions.map(({ question, recordSlug, recordTitle }) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      record={
                        recordSlug && recordTitle
                          ? { slug: recordSlug, title: recordTitle }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
                내 질문들
              </h2>
              {myQuestions.length === 0 ? (
                <EmptyState variant="questions" message="아직 남긴 질문이 없습니다." />
              ) : (
                <div className="flex flex-col gap-5">
                  {myQuestions.map(({ question, recordSlug, recordTitle }) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      record={
                        recordSlug && recordTitle
                          ? { slug: recordSlug, title: recordTitle }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "responses" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
                내가 남긴 응답들
              </h2>
              {myResponses.length === 0 ? (
                <EmptyState variant="generic" message="아직 남긴 응답이 없습니다. 다른 Learner의 기록에 공명이나 질문을 남겨보세요." />
              ) : (
                <div className="flex flex-col gap-5">
                  {myResponses.map((response) => (
                    <div key={response.id} className="relative group">
                      <ResponseCard
                        response={response}
                        author={learner ? { displayName: learner.displayName, slug: learner.slug } : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
                저장한 기록
              </h2>
              {mySavedRecords.length === 0 ? (
                <EmptyState variant="generic" message="아직 저장한 기록이 없습니다. 다른 Learner의 기록을 읽다가 나중에 다시 보고 싶은 글을 저장해보세요." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mySavedRecords.map((saved) => (
                    <SceneCard
                      key={saved.record.id}
                      record={{
                        slug: saved.record.slug,
                        title: saved.record.title,
                        content: saved.record.content,
                        format: saved.record.format as "note" | "article",
                        type: saved.record.type as "personal" | "challenge" | "collaboration",
                        rhythm: saved.record.rhythm ?? undefined,
                        createdAt: saved.record.createdAt,
                      }}
                      author={saved.author ? { displayName: saved.author.displayName, slug: saved.author.slug } : undefined}
                      stage={saved.stage ? { name: saved.stage.name, type: saved.stage.type } : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
