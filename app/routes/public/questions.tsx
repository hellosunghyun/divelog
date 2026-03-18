import type { Route } from "./+types/questions";
import { useNavigate } from "react-router";

import QuestionCard from "~/components/cards/QuestionCard";
import EmptyState from "~/components/feedback/EmptyState";
import HeroSection from "~/components/sections/HeroSection";
import { Link } from "~/components/content/SmartLink";
import { getOpenQuestions } from "~/db/queries/dialogue/questions.server";
import { createLogger } from "~/lib/infra/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "열린 질문들 — DiveLog" },
    { name: "description", content: "동료들이 남긴 열린 질문을 따라 기록으로 다시 잠수해보세요." },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "questions" });
  logger.info("loader_start");

  const questions = await getOpenQuestions(context.cloudflare.env.DB);

  logger.info("loader_end", {
    questionCount: questions.length,
  });

  return {
    questions,
  };
}

export default function QuestionsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { questions } = loaderData;

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
        {questions.length === 0 ? (
          <EmptyState variant="questions" />
        ) : (
          <section className="flex flex-col gap-8">
            {questions.map((question) => {
              const metaItems: string[] = [question.authorName];
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
