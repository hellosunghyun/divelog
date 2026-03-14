import { data } from "react-router";
import type { Route } from "./+types/_public.memories.$stageSlug";
import { Link } from "react-router";
import { db } from "../db/client.server";
import {
  collectiveMemories,
  stages,
  memoryQuestions,
  memoryRecords,
  memorySentences,
  questions,
  records,
  sentences,
} from "../db/schema.server";
import { eq, and } from "drizzle-orm";
import HeroSection from "../components/HeroSection";
import QuestionCard from "../components/QuestionCard";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import SceneCard from "../components/SceneCard";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { stageSlug } = params;
  const database = db(context.cloudflare.env.DB);

  const stageResult = await database
    .select()
    .from(stages)
    .where(eq(stages.slug, stageSlug))
    .limit(1);
  const stage = stageResult[0];

  if (!stage) {
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  const memoryResult = await database
    .select()
    .from(collectiveMemories)
    .where(
      and(
        eq(collectiveMemories.stageId, stage.id),
        eq(collectiveMemories.status, "published")
      )
    )
    .limit(1);
  const memory = memoryResult[0];

  if (!memory) {
    throw data("아직 발행된 Collective Memory가 없습니다", { status: 404 });
  }

  const [memQuestions, memSentences, memRecords] = await database.batch([
    database
      .select({ question: questions })
      .from(memoryQuestions)
      .leftJoin(questions, eq(memoryQuestions.questionId, questions.id))
      .where(eq(memoryQuestions.memoryId, memory.id)),
    database
      .select({ sentence: sentences })
      .from(memorySentences)
      .leftJoin(sentences, eq(memorySentences.sentenceId, sentences.id))
      .where(eq(memorySentences.memoryId, memory.id)),
    database
      .select({ record: records })
      .from(memoryRecords)
      .leftJoin(records, eq(memoryRecords.recordId, records.id))
      .where(eq(memoryRecords.memoryId, memory.id)),
  ]);

  return { stage, memory, memQuestions, memSentences, memRecords };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Collective Memory — divelog" }];
  }
  return [{ title: `${loaderData.stage.name} Memory — divelog` }];
}

export default function MemoryPage({ loaderData }: Route.ComponentProps) {
  const { stage, memory, memQuestions, memSentences, memRecords } = loaderData;

  return (
    <div>
      <HeroSection
        variant="memory"
        title={`${stage.name} — 공동 기억`}
        subtitle={memory.summary ?? undefined}
        accentTone={stage.type}
      />

      <div
        style={{
          maxWidth: "var(--max-reading-width)",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        {memQuestions.length > 0 && (
          <section style={{ marginBottom: "var(--space-10)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              오래 남은 질문들
            </h2>
            {memQuestions.map(({ question }) =>
              question ? <QuestionCard key={question.id} question={question} /> : null
            )}
          </section>
        )}

        {memSentences.length > 0 && (
          <section style={{ marginBottom: "var(--space-10)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              오래 남은 문장들
            </h2>
            {memSentences.map(({ sentence }) =>
              sentence ? (
                <HighlightedSentenceCard key={sentence.id} sentence={sentence} />
              ) : null
            )}
          </section>
        )}

        {memory.carryForwardQuestion && (
          <section
            style={{
              marginBottom: "var(--space-10)",
              padding: "var(--space-8)",
              backgroundColor: "var(--color-mist-blue)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-tertiary)",
                marginBottom: "var(--space-3)",
              }}
            >
              다음으로 이어가는 질문
            </p>
            <p
              style={{
                fontSize: "var(--font-size-xl)",
                color: "var(--color-text-primary)",
                fontStyle: "italic",
              }}
            >
              "{memory.carryForwardQuestion}"
            </p>
          </section>
        )}

        {memRecords.length > 0 && (
          <section>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              대표 기록들
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {memRecords.map(({ record }) =>
                record ? <SceneCard key={record.id} record={record} /> : null
              )}
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
      <p
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "var(--color-text-primary)",
        }}
      >
        Collective Memory를 찾을 수 없습니다
      </p>
      <Link
        to="/journey"
        style={{
          marginTop: "16px",
          display: "inline-block",
          padding: "10px 20px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-ocean-blue)",
          color: "white",
        }}
      >
        여정으로
      </Link>
    </div>
  );
}
