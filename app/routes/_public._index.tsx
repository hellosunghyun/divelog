import type { Route } from "./+types/_public._index";
import { db } from "../db/client.server";
import { stages, records, questions, sentences, learnerProfiles } from "../db/schema.server";
import { eq, desc, and, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import QuestionCard from "../components/QuestionCard";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import LearnerCard from "../components/LearnerCard";
import StageStrip from "../components/StageStrip";
import HeroSection from "../components/HeroSection";
import CTABand from "../components/CTABand";
import EmptyState from "../components/EmptyState";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "divelog — ADA Learner 여정 아카이브" },
    { name: "description", content: "ADA Learner의 아홉 달을 기록하는 Journey-first 아카이브" },
    { property: "og:title", content: "divelog" },
    { property: "og:description", content: "ADA Learner의 여정을 함께 기록합니다" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);

  const [allStages, currentStageResult, recentRecords, openQuestions, recentSentences, spotlightLearners] = await database.batch([
    database.select().from(stages).orderBy(stages.order),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        rhythm: records.rhythm,
        createdAt: records.createdAt,
        authorDisplayName: learnerProfiles.displayName,
        authorSlug: learnerProfiles.slug,
        authorProfilePhotoUrl: learnerProfiles.profilePhotoUrl,
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(sql`${records.visibility} != 'draft'`)
      .orderBy(desc(records.createdAt))
      .limit(6),
    database
      .select({
        questionId: questions.id,
        questionContent: questions.content,
        questionDirection: questions.direction,
        questionIsOpen: questions.isOpen,
        recordSlug: records.slug,
        recordTitle: records.title,
      })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(questions.isOpen, true), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(questions.createdAt))
      .limit(3),
    database
      .select({
        sentenceId: sentences.id,
        sentenceContent: sentences.content,
        sentenceReason: sentences.reason,
        savedByDisplayName: learnerProfiles.displayName,
        savedBySlug: learnerProfiles.slug,
        recordSlug: records.slug,
        recordTitle: records.title,
      })
      .from(sentences)
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .leftJoin(records, eq(sentences.recordId, records.id))
      .orderBy(desc(sentences.createdAt))
      .limit(4),
    database.select().from(learnerProfiles).limit(4),
  ]);

  const currentStage = currentStageResult[0] ?? null;

  return { allStages, currentStage, recentRecords, openQuestions, recentSentences, spotlightLearners };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { allStages, currentStage, recentRecords, openQuestions, recentSentences, spotlightLearners } = loaderData;

  return (
    <div>
      <HeroSection
        variant="home"
        title="여정을 기록합니다"
        subtitle="ADA Learner의 아홉 달을 탐색하고, 질문하고, 연결합니다. 완성된 글이 아니어도 괜찮습니다."
      >
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <a
            href="/journey"
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-ocean-blue)",
              color: "white",
              textDecoration: "none",
              fontSize: "var(--font-size-base)",
            }}
          >
            여정 탐색하기
          </a>
          <a
            href="/logs"
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: "var(--font-size-base)",
            }}
          >
            기록 보기
          </a>
        </div>
      </HeroSection>

      {allStages.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <StageStrip stages={allStages} currentStageSlug={currentStage?.slug} />
        </div>
      )}

      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto", padding: "var(--space-12) var(--space-4)" }}>
        {currentStage && (
          <section style={{ marginBottom: "var(--space-12)" }}>
            <div style={{ marginBottom: "var(--space-6)" }}>
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-mist-blue)",
                  color: "var(--color-ocean-blue)",
                }}
              >
                현재 Stage
              </span>
              <h2
                style={{
                  marginTop: "var(--space-3)",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-primary)",
                }}
              >
                {currentStage.name}
              </h2>
              {currentStage.description && (
                <p
                  style={{
                    marginTop: "var(--space-2)",
                    fontSize: "var(--font-size-base)",
                    color: "var(--color-text-secondary)",
                    maxWidth: "var(--max-reading-width)",
                  }}
                >
                  {currentStage.description}
                </p>
              )}
            </div>
          </section>
        )}

        {openQuestions.length > 0 && (
          <section style={{ marginBottom: "var(--space-12)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              열린 질문들
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {openQuestions.map((row) => (
                <QuestionCard
                  key={row.questionId}
                  question={{
                    id: row.questionId,
                    content: row.questionContent,
                    direction: row.questionDirection ?? undefined,
                    isOpen: row.questionIsOpen ?? undefined,
                  }}
                  record={
                    row.recordSlug && row.recordTitle
                      ? { slug: row.recordSlug, title: row.recordTitle }
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: "var(--space-12)" }}>
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
              최근 기록
            </h2>
            <a href="/logs" style={{ fontSize: "14px", color: "var(--color-text-tertiary)" }}>
              전체 보기 →
            </a>
          </div>
          {recentRecords.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {recentRecords.map((row) => (
                <SceneCard
                  key={row.id}
                  record={{
                    slug: row.slug,
                    title: row.title,
                    content: row.content,
                    format: row.format as "note" | "article",
                    type: row.type as "personal" | "challenge" | "collaboration",
                    rhythm: row.rhythm ?? undefined,
                    createdAt: row.createdAt,
                  }}
                  author={
                    row.authorDisplayName && row.authorSlug
                      ? { displayName: row.authorDisplayName, slug: row.authorSlug }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState variant="records" action={{ label: "첫 기록 남기기", href: "/write" }} />
          )}
        </section>

        {recentSentences.length > 0 && (
          <section style={{ marginBottom: "var(--space-12)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              남겨두고 싶은 문장들
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {recentSentences.map((row) => (
                <HighlightedSentenceCard
                  key={row.sentenceId}
                  sentence={{
                    id: row.sentenceId,
                    content: row.sentenceContent,
                    reason: row.sentenceReason ?? undefined,
                  }}
                  savedBy={
                    row.savedByDisplayName && row.savedBySlug
                      ? { displayName: row.savedByDisplayName, slug: row.savedBySlug }
                      : undefined
                  }
                  record={
                    row.recordSlug && row.recordTitle
                      ? { slug: row.recordSlug, title: row.recordTitle }
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        {spotlightLearners.length > 0 && (
          <section style={{ marginBottom: "var(--space-12)" }}>
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
                Learner
              </h2>
              <a href="/learners" style={{ fontSize: "14px", color: "var(--color-text-tertiary)" }}>
                전체 보기 →
              </a>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {spotlightLearners.map((learner) => (
                <LearnerCard key={learner.userId} learner={learner} />
              ))}
            </div>
          </section>
        )}

        <CTABand
          message="완성된 글이 아니어도 괜찮습니다. 지금 이 순간을 기록해보세요."
          primaryCta={{ label: "기록하기", href: "/write" }}
          secondaryCta={{ label: "가이드 보기", href: "/guide" }}
        />
      </div>
    </div>
  );
}
