import { data } from "react-router";
import type { Route } from "./+types/$learnerSlug";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { learnerProfiles, records, questions, sentences, stages, collaborationUnits, collaborationMembers } from "~/db/schema.server";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import QuestionCard from "~/components/QuestionCard";
import HighlightedSentenceCard from "~/components/HighlightedSentenceCard";
import CollaborationUnitCard from "~/components/CollaborationUnitCard";
import EmptyState from "~/components/EmptyState";
import HeroSection from "~/components/HeroSection";
import { createLogger } from "~/lib/logger.server";

const cache = new Map<string, unknown>();

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { learnerSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "learner_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const learnerResult = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, learnerSlug)).limit(1);
  const learner = learnerResult[0];
  if (!learner) {
    logger.info("not_found", { slug: learnerSlug });
    throw data("러너를 찾을 수 없습니다", { status: 404 });
  }

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true), sql`${records.visibility} != 'draft'`)).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).leftJoin(records, eq(sentences.recordId, records.id)).where(and(eq(sentences.savedById, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

  const recordsWithStage = await database
    .select({
      stageId: records.stageId,
      stageName: stages.name,
      stageSlug: stages.slug,
    })
    .from(records)
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(and(eq(records.authorId, learner.userId), ne(records.visibility, "draft")));

  const stageCountMap = new Map<string, { stageId: string | null; stageName: string | null; stageSlug: string | null; count: number }>();
  for (const row of recordsWithStage) {
    const key = row.stageId ?? "no-stage";
    const existing = stageCountMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      stageCountMap.set(key, {
        stageId: row.stageId,
        stageName: row.stageName,
        stageSlug: row.stageSlug,
        count: 1,
      });
    }
  }
  const recordsByStage = Array.from(stageCountMap.values());

  const learnerCollaborationUnits = await database
    .select({
      id: collaborationUnits.id,
      slug: collaborationUnits.slug,
      name: collaborationUnits.name,
      currentQuestion: collaborationUnits.currentQuestion,
      status: collaborationUnits.status,
      description: collaborationUnits.description,
    })
    .from(collaborationUnits)
    .innerJoin(
      collaborationMembers,
      eq(collaborationUnits.id, collaborationMembers.unitId)
    )
    .where(eq(collaborationMembers.learnerId, learner.userId));

  logger.info("loader_end");
  return { learner, learnerRecords, learnerQuestions, learnerSentences, recordsByStage, collaborationUnits: learnerCollaborationUnits };
}

export async function clientLoader({ params, serverLoader }: {
  params: { learnerSlug?: string };
  serverLoader: () => Promise<unknown>;
}) {
  const key = params.learnerSlug ?? "";
  if (cache.has(key)) return cache.get(key);
  const loaderData = await serverLoader();
  cache.set(key, loaderData);
  return loaderData;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
   if (!loaderData) return [{ title: "러너 — DiveLog" }];
   const typedData = loaderData as Awaited<ReturnType<typeof loader>>;
   return [{ title: `${typedData.learner.displayName} — DiveLog` }];
 }

export default function LearnerDetailPage({ loaderData }: Route.ComponentProps) {
  const { learner, learnerRecords, learnerQuestions, learnerSentences, recordsByStage, collaborationUnits } = loaderData as Awaited<ReturnType<typeof loader>>;

  return (
    <div>
      <HeroSection variant="learner" title={learner.displayName} subtitle={learner.bio ?? undefined} />

      <div className="max-w-content mx-auto py-16 px-6">
        {/* Questions FIRST — before records */}
        {learnerQuestions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              탐구 중인 질문들
            </h2>
            <div className="flex flex-col gap-5">
              {learnerQuestions.map((item: any) => {
                const { question, recordSlug, recordTitle } = item;
                return (
                  <QuestionCard key={question.id} question={question} record={recordSlug && recordTitle ? { slug: recordSlug, title: recordTitle } : undefined} />
                );
              })}
            </div>
          </section>
        )}

        {/* Records */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            기록
          </h2>
          {learnerRecords.length === 0 ? (
            <EmptyState variant="records" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {learnerRecords.map((item: any) => {
                const { record } = item;
                return (
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
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Saved Sentences */}
        {learnerSentences.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              남겨둔 문장들
            </h2>
            <div className="flex flex-col gap-5">
              {learnerSentences.map((item: any) => {
                const { sentence } = item;
                return <HighlightedSentenceCard key={sentence.id} sentence={sentence} />;
              })}
            </div>
          </section>
        )}

        {recordsByStage.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              기록 아카이브
            </h2>
            <div className="flex flex-col">
              {recordsByStage.map((stage) => (
                <Link
                  key={stage.stageId ?? "no-stage"}
                  to={stage.stageSlug ? `/journey/${stage.stageSlug}` : "/journey"}
                  className="flex justify-between items-center border-b border-border py-3 no-underline hover:bg-surface-secondary transition-colors"
                >
                  <span className="text-text-primary font-medium">
                    {stage.stageName ?? "Stage 없음"}
                  </span>
                  <span className="text-meta text-text-secondary">
                    {stage.count}개의 기록
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            협업 이력
          </h2>
          {collaborationUnits.length === 0 ? (
            <EmptyState variant="generic" message="아직 참여한 협업 그룹이 없습니다." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {collaborationUnits.map((unit) => (
                <CollaborationUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">러너를 찾을 수 없습니다</p>
      <Link to="/learners" className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">목록으로</Link>
    </div>
  );
}
