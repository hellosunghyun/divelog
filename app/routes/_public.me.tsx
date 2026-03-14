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

      <div
        style={{
          maxWidth: "var(--max-content-width)",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        <section style={{ marginBottom: "var(--space-10)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-6)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
              }}
            >
              임시저장
            </h2>
            <Link to="/write" style={{ fontSize: "14px", color: "var(--color-ocean-blue)" }}>
              + 새 기록
            </Link>
          </div>
          {drafts.length === 0 ? (
            <EmptyState variant="records" message="임시저장된 기록이 없습니다." />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {drafts.map(({ record }) => (
                <SceneCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            저장한 문장들
          </h2>
          {mySentences.length === 0 ? (
            <EmptyState variant="generic" message="저장한 문장이 없습니다." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {mySentences.map(({ sentence }) => (
                <HighlightedSentenceCard key={sentence.id} sentence={sentence} />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            내 질문들
          </h2>
          {myQuestions.length === 0 ? (
            <EmptyState variant="questions" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            미답변 질문들
          </h2>
          {unansweredQuestions.length === 0 ? (
            <EmptyState variant="questions" message="미답변 질문이 없습니다." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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
