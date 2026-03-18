import type { Route } from "./+types/questions";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { asc, eq, inArray } from "drizzle-orm";

import QuestionCard from "~/components/cards/QuestionCard";
import EmptyState from "~/components/feedback/EmptyState";
import HeroSection from "~/components/sections/HeroSection";
import { Link } from "~/components/content/SmartLink";
import { db } from "~/db/client.server";
import { getOpenQuestions, type OpenQuestionListItem } from "~/db/queries/dialogue/questions.server";
import { questions as questionsTable, records, stages } from "~/db/schema.server";
import { createLogger } from "~/lib/infra/logger.server";
import { cn } from "~/lib/utils/cn";

type StageFilter = {
  id: string;
  name: string;
  slug: string;
  type: string;
};

type QuestionListItem = OpenQuestionListItem & {
  stageId: string | null;
};

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "열린 질문들 — DiveLog" },
    { name: "description", content: "동료들이 남긴 열린 질문을 따라 기록으로 다시 잠수해보세요." },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "questions" });
  logger.info("loader_start");

  const url = new URL(request.url);
  const requestedStageId = url.searchParams.get("stage");
  const database = db(context.cloudflare.env.DB);

  const [openQuestions, allStages]: [OpenQuestionListItem[], StageFilter[]] = await Promise.all([
    getOpenQuestions(context.cloudflare.env.DB),
    database
      .select({
        id: stages.id,
        name: stages.name,
        slug: stages.slug,
        type: stages.type,
      })
      .from(stages)
      .where(eq(stages.status, "active"))
      .orderBy(asc(stages.order)),
  ]);

  const selectedStageId = allStages.some((stage) => stage.id === requestedStageId)
    ? requestedStageId
    : null;

  let stageIdsByQuestion = new Map<string, string | null>();

  if (openQuestions.length > 0) {
    const questionStageRows = await database
      .select({
        questionId: questionsTable.id,
        stageId: records.stageId,
      })
      .from(questionsTable)
      .innerJoin(records, eq(questionsTable.recordId, records.id))
      .where(inArray(questionsTable.id, openQuestions.map((question: OpenQuestionListItem) => question.id)));

    stageIdsByQuestion = new Map(
      questionStageRows.map((row: { questionId: string; stageId: string | null }) => [row.questionId, row.stageId]),
    );
  }

  const questions: QuestionListItem[] = openQuestions.map((question: OpenQuestionListItem) => ({
    ...question,
    stageId: stageIdsByQuestion.get(question.id) ?? null,
  }));

  const filteredQuestions = selectedStageId
    ? questions.filter((question) => question.stageId === selectedStageId)
    : questions;

  logger.info("loader_end", {
    questionCount: filteredQuestions.length,
    selectedStageId,
  });

  return {
    questions: filteredQuestions,
    allStages,
    selectedStageId,
  };
}

function buildStageHref(stageId: string | null) {
  if (!stageId) return "/questions";

  const params = new URLSearchParams();
  params.set("stage", stageId);
  return `/questions?${params.toString()}`;
}

export default function QuestionsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const {
    questions,
    allStages,
    selectedStageId,
  }: {
    questions: QuestionListItem[];
    allStages: StageFilter[];
    selectedStageId: string | null;
  } = loaderData;

  const stageNameById = useMemo(
    () => new Map(allStages.map((stage: StageFilter) => [stage.id, stage.name])),
    [allStages],
  );

  const selectedStageName = selectedStageId ? stageNameById.get(selectedStageId) : null;

  return (
    <div>
      <HeroSection
        variant="home"
        title={<>열린 질문들</>}
        subtitle={<>동료들이 남긴 질문을 따라가며,<br />기록으로 다시 돌아가 대화를 이어가 보세요.</>}
        badge="Dialogue Layer"
      >
        <Link
          to="/journey"
          className="w-full sm:w-auto border border-white/20 bg-white/5 px-6 py-3 rounded-full font-medium text-white backdrop-blur-xl hover:bg-white/10 transition-all text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          여정 보기
        </Link>
      </HeroSection>

      <div className="max-w-content mx-auto px-6 py-12 md:py-16">
        {allStages.length > 0 && (
          <section className="mb-10 md:mb-12">
            <p className="mb-4 text-sm font-medium text-text-secondary">
              Stage별로 질문을 가볍게 좁혀볼 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to={buildStageHref(null)}
                aria-current={selectedStageId ? undefined : "page"}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-sm font-medium no-underline transition-colors",
                  selectedStageId
                    ? "border border-border bg-surface text-text-secondary hover:border-ocean-blue/20 hover:bg-mist-blue/40 hover:text-ocean-blue"
                    : "bg-deep-ocean text-white shadow-[0_14px_28px_rgba(11,36,71,0.16)]",
                )}
              >
                전체
              </Link>
              {allStages.map((stage: StageFilter) => (
                <Link
                  key={stage.id}
                  to={buildStageHref(stage.id)}
                  aria-current={selectedStageId === stage.id ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-sm font-medium no-underline transition-colors",
                    selectedStageId === stage.id
                      ? "bg-ocean-blue text-white shadow-[0_14px_28px_rgba(20,108,148,0.18)]"
                      : "border border-border bg-surface text-text-secondary hover:border-ocean-blue/20 hover:bg-mist-blue/40 hover:text-ocean-blue",
                  )}
                >
                  {stage.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {questions.length === 0 ? (
          <EmptyState
            variant="questions"
            message={selectedStageName ? `${selectedStageName}에서 이어지고 있는 열린 질문은 아직 없습니다.` : undefined}
            action={selectedStageId ? { label: "전체 질문 보기", href: "/questions" } : undefined}
          />
        ) : (
          <section className="flex flex-col gap-8">
            {questions.map((question: QuestionListItem) => {
              const metaItems: string[] = [question.authorName];
              const stageName = question.stageId ? stageNameById.get(question.stageId) : null;

              if (stageName) metaItems.push(stageName);
              if (question.selfAnswerCount > 0) metaItems.push(`자기답변 ${question.selfAnswerCount}`);
              if (question.responseCount > 0) metaItems.push(`응답 ${question.responseCount}`);

              return (
                <article key={question.id} className="flex flex-col gap-3">
                  <QuestionCard
                    question={{
                      id: question.id,
                      content: question.content,
                      direction: question.direction,
                      isOpen: question.isOpen,
                    }}
                    record={
                      question.recordSlug
                        ? {
                            slug: question.recordSlug,
                            title: question.recordTitle ?? "기록",
                          }
                        : undefined
                    }
                    onRespond={question.recordSlug ? () => navigate(`/logs/${question.recordSlug}`) : undefined}
                  />

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm text-text-tertiary">
                    {metaItems.map((item) => (
                      <span key={`${question.id}-${item}`}>{item}</span>
                    ))}
                    {question.isCarryOver && (
                      <span className="rounded-full bg-mist-blue px-3 py-1 text-xs font-medium text-ocean-blue">
                        이어진 질문
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
