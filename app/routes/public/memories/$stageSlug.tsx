import { data } from "react-router";
import type { Route } from "./+types/$stageSlug";
import { Link } from "~/components/content/SmartLink";
import { eq, and } from "drizzle-orm";
import HeroSection from "~/components/sections/HeroSection";
import QuestionCard from "~/components/cards/QuestionCard";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import SceneCard from "~/components/cards/SceneCard";
import { db } from "~/db/client.server";
import {
  collectiveMemories,
  stages,
  memoryQuestions,
  memoryRecords,
  memorySentences,
  questions,
  records,
  sentences,
} from "~/db/schema.server";
import { createLogger } from "~/lib/infra/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { stageSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "memory_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const stageResult = await database
    .select()
    .from(stages)
    .where(eq(stages.slug, stageSlug))
    .limit(1);
  const stage = stageResult[0];

  if (!stage) {
    logger.info("not_found", { slug: stageSlug });
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
    logger.info("not_found", { slug: stageSlug });
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

  logger.info("loader_end");
  return { stage, memory, memQuestions, memSentences, memRecords };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Collective Memory — DiveLog" }];
  }
  return [{ title: `${loaderData.stage.name} Memory — DiveLog` }];
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

      <div className="max-w-reading mx-auto py-16 px-6 md:py-24">
        {memQuestions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              오래 남은 질문들
            </h2>
            {memQuestions.map(({ question }) =>
              question ? <QuestionCard key={question.id} question={question} /> : null
            )}
          </section>
        )}

        {memSentences.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
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
          <section className="mb-12 p-8 bg-mist-blue rounded-lg">
            <p className="text-meta text-text-tertiary mb-3">
              다음으로 이어가는 질문
            </p>
            <p className="text-xl text-text-primary italic">
              "{memory.carryForwardQuestion}"
            </p>
          </section>
        )}

        {memRecords.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              대표 기록들
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">
        Collective Memory를 찾을 수 없습니다
      </p>
      <Link
        to="/journey"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        여정으로
      </Link>
    </div>
  );
}
