import { data } from "react-router";
import type { Route } from "./+types/$learnerSlug";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { learnerProfiles, records, questions, sentences } from "~/db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import QuestionCard from "~/components/QuestionCard";
import HighlightedSentenceCard from "~/components/HighlightedSentenceCard";
import EmptyState from "~/components/EmptyState";
import HeroSection from "~/components/HeroSection";
import { createLogger } from "~/lib/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { learnerSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "learner_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const learnerResult = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, learnerSlug)).limit(1);
  const learner = learnerResult[0];
  if (!learner) {
    logger.info("not_found", { slug: learnerSlug });
    throw data("Learner를 찾을 수 없습니다", { status: 404 });
  }

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true))).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).where(eq(sentences.savedById, learner.userId)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

  logger.info("loader_end");
  return { learner, learnerRecords, learnerQuestions, learnerSentences };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Learner — divelog" }];
  return [{ title: `${loaderData.learner.displayName} — divelog` }];
}

export default function LearnerDetailPage({ loaderData }: Route.ComponentProps) {
  const { learner, learnerRecords, learnerQuestions, learnerSentences } = loaderData;

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
              {learnerQuestions.map(({ question, recordSlug, recordTitle }) => (
                <QuestionCard key={question.id} question={question} record={recordSlug && recordTitle ? { slug: recordSlug, title: recordTitle } : undefined} />
              ))}
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
              {learnerRecords.map(({ record }) => (
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
              ))}
            </div>
          )}
        </section>

        {/* Saved Sentences */}
        {learnerSentences.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              남겨둔 문장들
            </h2>
            <div className="flex flex-col gap-5">
              {learnerSentences.map(({ sentence }) => <HighlightedSentenceCard key={sentence.id} sentence={sentence} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">Learner를 찾을 수 없습니다</p>
      <Link to="/learners" className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">목록으로</Link>
    </div>
  );
}
