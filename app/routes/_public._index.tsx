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
        <div className="flex gap-4 flex-wrap">
          <a
            href="/journey"
            className="px-6 py-3 rounded-md bg-ocean-blue text-white text-base font-medium hover:bg-deep-ocean transition-colors focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            여정 탐색하기
          </a>
          <a
            href="/logs"
            className="px-6 py-3 rounded-md border border-border text-text-secondary text-base font-medium hover:bg-surface-secondary transition-colors"
          >
            기록 보기
          </a>
        </div>
      </HeroSection>

      {allStages.length > 0 && (
        <div className="bg-surface border-b border-border">
          <StageStrip stages={allStages} currentStageSlug={currentStage?.slug} />
        </div>
      )}

      <div className="max-w-content mx-auto px-4 py-12 md:py-20">
        {currentStage && (
          <section className="mb-12">
            <div className="mb-6">
              <span className="text-caption px-2.5 py-0.5 rounded-full bg-mist-blue text-ocean-blue">
                현재 Stage
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">
                {currentStage.name}
              </h2>
              {currentStage.description && (
                <p className="mt-2 text-base text-text-secondary max-w-reading">
                  {currentStage.description}
                </p>
              )}
            </div>
          </section>
        )}

        {openQuestions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              열린 질문들
            </h2>
            <div className="flex flex-col gap-4">
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

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              최근 기록
            </h2>
            <a href="/logs" className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">
              전체 보기 →
            </a>
          </div>
          {recentRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              남겨두고 싶은 문장들
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-primary">
                Learner
              </h2>
              <a href="/learners" className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">
                전체 보기 →
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
