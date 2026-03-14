import type { Route } from "./+types/_public.me";
import { requireAuth } from "../lib/auth.middleware";
import { db } from "../db/client.server";
import { records, sentences, questions, learnerProfiles } from "../db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import QuestionCard from "../components/QuestionCard";
import EmptyState from "../components/EmptyState";
import HeroSection from "../components/HeroSection";
import { Link } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "내 공간 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const database = db(context.cloudflare.env.DB);

  const [drafts, mySentences, myQuestions, unansweredQuestions] = await database.batch([
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
  ]);

  const learnerResult = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);

  return {
    learner: learnerResult[0] ?? null,
    drafts,
    mySentences,
    myQuestions,
    unansweredQuestions,
  };
}

export default function MySpacePage({ loaderData }: Route.ComponentProps) {
  const { learner, drafts, mySentences, myQuestions, unansweredQuestions } = loaderData;

  return (
    <div>
      <HeroSection
        variant="learner"
        title={learner?.displayName ?? "내 공간"}
        subtitle={learner?.bio ?? undefined}
      />

      <div className="max-w-content mx-auto py-12 px-4 md:py-20">
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              임시저장
            </h2>
            <Link to="/write" className="text-sm text-ocean-blue hover:underline">
              + 새 기록
            </Link>
          </div>
          {drafts.length === 0 ? (
            <EmptyState variant="records" message="임시저장된 기록이 없습니다." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map(({ record }) => (
                <SceneCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-6">
            저장한 문장들
          </h2>
          {mySentences.length === 0 ? (
            <EmptyState variant="generic" message="저장한 문장이 없습니다." />
          ) : (
            <div className="flex flex-col gap-3">
              {mySentences.map(({ sentence }) => (
                <HighlightedSentenceCard key={sentence.id} sentence={sentence} />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-6">
            내 질문들
          </h2>
          {myQuestions.length === 0 ? (
            <EmptyState variant="questions" />
          ) : (
            <div className="flex flex-col gap-4">
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
          <h2 className="text-xl font-semibold text-text-primary mb-6">
            미답변 질문들
          </h2>
          {unansweredQuestions.length === 0 ? (
            <EmptyState variant="questions" message="미답변 질문이 없습니다." />
          ) : (
            <div className="flex flex-col gap-4">
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
