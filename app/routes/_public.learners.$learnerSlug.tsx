import { data } from "react-router";
import type { Route } from "./+types/_public.learners.$learnerSlug";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { learnerProfiles, records, questions, sentences } from "../db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import QuestionCard from "../components/QuestionCard";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import EmptyState from "../components/EmptyState";
import HeroSection from "../components/HeroSection";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { learnerSlug } = params;
  const database = db(context.cloudflare.env.DB);

  const learnerResult = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, learnerSlug)).limit(1);
  const learner = learnerResult[0];
  if (!learner) throw data("Learner를 찾을 수 없습니다", { status: 404 });

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true))).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).where(eq(sentences.savedById, learner.userId)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

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

      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto", padding: "var(--space-12) var(--space-4)" }}>
        {/* Questions FIRST — before records */}
        {learnerQuestions.length > 0 && (
          <section style={{ marginBottom: "var(--space-12)" }}>
            <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              탐구 중인 질문들
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {learnerQuestions.map(({ question, recordSlug, recordTitle }) => (
                <QuestionCard key={question.id} question={question} record={recordSlug && recordTitle ? { slug: recordSlug, title: recordTitle } : undefined} />
              ))}
            </div>
          </section>
        )}

        {/* Records */}
        <section style={{ marginBottom: "var(--space-12)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
            기록
          </h2>
          {learnerRecords.length === 0 ? (
            <EmptyState variant="records" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
              {learnerRecords.map(({ record }) => <SceneCard key={record.id} record={record} />)}
            </div>
          )}
        </section>

        {/* Saved Sentences */}
        {learnerSentences.length > 0 && (
          <section>
            <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              남겨둔 문장들
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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
    <div style={{ textAlign: "center", padding: "64px 16px" }}>
      <p style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-text-primary)" }}>Learner를 찾을 수 없습니다</p>
      <Link to="/learners" style={{ marginTop: "16px", display: "inline-block", padding: "10px 20px", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-ocean-blue)", color: "white" }}>목록으로</Link>
    </div>
  );
}
