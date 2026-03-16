import type { Route } from "./+types/_public.me";
import { requireAuth } from "../lib/auth.middleware";
import { db } from "../db/client.server";
import { records, sentences, questions, learnerProfiles, stages } from "../db/schema.server";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import QuestionCard from "../components/QuestionCard";
import EmptyState from "../components/EmptyState";
import HeroSection from "../components/HeroSection";
import { Link } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "내 공간 — divelog" }];
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
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);

  const [drafts, mySentences, myQuestions, unansweredQuestions, allStages, myRecordsWithStage] = await database.batch([
    database
      .select({ record: records })
      .from(records)
      .where(and(eq(records.authorId, auth.user.id), eq(records.visibility, "draft")))
      .orderBy(desc(records.updatedAt))
      .limit(5),
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
      .limit(5),
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
      .limit(5),
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
      .where(eq(records.authorId, auth.user.id))
      .orderBy(desc(records.createdAt)),
  ]);

  const learnerResult = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);

  const recordsByStage: Record<string, typeof myRecordsWithStage> = {};
  for (const row of myRecordsWithStage) {
    const stageId = row.stageId ?? "no-stage";
    if (!recordsByStage[stageId]) {
      recordsByStage[stageId] = [];
    }
    recordsByStage[stageId].push(row);
  }

  return {
    learner: learnerResult[0] ?? null,
    drafts,
    mySentences,
    myQuestions,
    unansweredQuestions,
    stages: allStages,
    recordsByStage,
  };
}

export default function MySpacePage({ loaderData }: Route.ComponentProps) {
  const { learner, drafts, mySentences, myQuestions, unansweredQuestions, stages, recordsByStage } = loaderData;

  return (
    <div>
      <HeroSection
        variant="learner"
        title={learner?.displayName ?? "내 공간"}
        subtitle={learner?.bio ?? undefined}
      />

      <div className="max-w-content mx-auto py-16 px-6 md:py-24">
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            나의 여정
          </h2>
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
                  {recordsByStage["no-stage"].slice(0, 5).map(({ record }) => (
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
                  {recordsByStage["no-stage"].length > 5 && (
                    <p className="text-sm text-text-tertiary mt-2">
                      외 {recordsByStage["no-stage"].length - 5}개의 기록
                    </p>
                  )}
                </div>
              </div>
            )}
            {stages.map((stage) => {
              const stageRecords = recordsByStage[stage.id] ?? [];
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
                      {toneStyle.label} · {stageRecords.length}개의 기록
                    </span>
                  </div>
                  
                  {stageRecords.length === 0 ? (
                    <p className="text-sm text-text-tertiary">
                      아직 이 구간에 기록이 없습니다. 무엇이든 남겨보세요.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {stageRecords.slice(0, 3).map(({ record }) => (
                        <Link
                          key={record.id}
                          to={`/logs/${record.slug}`}
                          className="block p-4 rounded-xl bg-surface border border-border-subtle hover:border-border transition-colors no-underline"
                        >
                          <h4 className="text-base font-medium text-text-primary mb-1">
                            {record.title}
                            {record.visibility === "draft" && (
                              <span className="ml-2 text-caption text-warning font-medium">임시저장</span>
                            )}
                          </h4>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {record.contentText?.substring(0, 100) ?? record.content.substring(0, 100)}
                          </p>
                        </Link>
                      ))}
                      {stageRecords.length > 3 && (
                        <p className="text-sm text-text-tertiary mt-2">
                          외 {stageRecords.length - 3}개의 기록
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">
              임시저장
            </h2>
            <Link to="/write" className="text-sm text-ocean-blue hover:text-ocean-blue transition-colors no-underline">
              + 새 기록
            </Link>
          </div>
          {drafts.length === 0 ? (
            <EmptyState variant="records" message="임시저장된 기록이 없습니다. 완성되지 않은 생각도 기록해보세요." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {drafts.map(({ record }) => (
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
                  <Link
                    to={`/logs/${record.slug}/edit`}
                    className="absolute top-4 right-4 text-caption px-2.5 py-1 rounded-full bg-ocean-blue/10 text-ocean-blue font-medium no-underline hover:bg-ocean-blue/20 transition-colors"
                  >
                    이어 쓰기
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            저장한 문장들
          </h2>
          {mySentences.length === 0 ? (
            <EmptyState variant="generic" message="저장한 문장이 없습니다." />
          ) : (
            <div className="flex flex-col gap-4">
              {mySentences.map(({ sentence }) => (
                <HighlightedSentenceCard key={sentence.id} sentence={sentence} />
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            내 질문들
          </h2>
          {myQuestions.length === 0 ? (
            <EmptyState variant="questions" />
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

        <section>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            미답변 질문들
          </h2>
          {unansweredQuestions.length === 0 ? (
            <EmptyState variant="questions" message="아직 답하지 않은 질문이 없습니다. 기록에 질문을 남기면 나중에 스스로 답해볼 수 있습니다." />
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
      </div>
    </div>
  );
}
