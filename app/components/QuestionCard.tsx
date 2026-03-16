import { Link } from "~/components/SmartLink";

export interface QuestionCardQuestion {
  id: string;
  content: string;
  direction?: string;
  isOpen?: boolean;
  recordSlug?: string;
  authorName?: string;
  createdAt?: number;
  type?: "personal" | "challenge";
  selfAnswerCount?: number;
  responseCount?: number;
  isCarryOver?: boolean;
}

interface QuestionCardProps {
  question: QuestionCardQuestion;
  record?: {
    slug: string;
    title: string;
  };
  onRespond?: () => void;
}

export function QuestionMetadataBadges({ question }: { question: QuestionCardQuestion }) {
  const hasNoAnswers =
    (!question.selfAnswerCount || question.selfAnswerCount === 0) &&
    (!question.responseCount || question.responseCount === 0);

  if (!question.isCarryOver && question.type !== "challenge" && !hasNoAnswers && !question.selfAnswerCount) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {question.type === "challenge" && (
        <span className="rounded-full border border-[--color-border] px-2 py-0.5 text-xs text-[--color-text-tertiary]">
          챌린지 질문
        </span>
      )}
      {hasNoAnswers && (
        <span className="rounded-full bg-[--color-mist-blue]/50 px-2 py-0.5 text-xs text-[--color-ocean-blue]">
          아직 답 없음
        </span>
      )}
      {question.isCarryOver && (
        <span className="rounded-full border border-[--color-border] px-2 py-0.5 text-xs text-[--color-text-tertiary]">
          이전 구간에서
        </span>
      )}
      {question.selfAnswerCount && question.selfAnswerCount > 0 && (
        <span className="rounded-full bg-[--color-surface-secondary] px-2 py-0.5 text-xs text-[--color-text-secondary]">
          ↺ 자기답변
        </span>
      )}
    </div>
  );
}

export default function QuestionCard({ question, record, onRespond }: QuestionCardProps) {
  const linkedRecord = record ?? (question.recordSlug ? { slug: question.recordSlug, title: "기록 보기" } : undefined);

  return (
    <article
      data-testid="question-card"
      className="rounded-2xl border border-border bg-surface p-7 lg:p-8 shadow-card"
    >
      <div className="text-caption font-medium tracking-widest uppercase text-ocean-blue/70 mb-4">
        {question.direction === "inward"
          ? "스스로에게 묻다"
          : question.direction === "next_stage"
          ? "다음 구간으로 가져갈 질문"
          : "함께 생각해볼 질문"}
      </div>

      <QuestionMetadataBadges question={question} />

      <p className="text-xl md:text-2xl leading-relaxed text-text-primary font-semibold mb-6 tracking-tight">
        {question.content}
      </p>

      {linkedRecord && (
        <div className="mb-4">
          <Link
            to={`/logs/${linkedRecord.slug}`}
            prefetch="viewport"
            className="text-sm text-text-tertiary no-underline"
          >
            ← {linkedRecord.title}
          </Link>
        </div>
      )}

      {question.isOpen !== false && onRespond && (
        <button
          type="button"
          onClick={onRespond}
          className="rounded-full px-5 py-2.5 text-sm border border-border bg-transparent text-text-secondary cursor-pointer transition-all duration-normal hover:border-ocean-blue/30 hover:bg-mist-blue/30 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          이 질문에 응답하기
        </button>
      )}
    </article>
  );
}
