import { Link } from "~/components/SmartLink";

interface QuestionCardProps {
  question: {
    id: string;
    content: string;
    direction?: string;
    isOpen?: boolean;
  };
  record?: {
    slug: string;
    title: string;
  };
  onRespond?: () => void;
}

export default function QuestionCard({ question, record, onRespond }: QuestionCardProps) {
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

      <p className="text-xl md:text-2xl leading-relaxed text-text-primary font-semibold mb-6 tracking-tight">
        {question.content}
      </p>

      {record && (
        <div className="mb-4">
          <Link
            to={`/logs/${record.slug}`}
            prefetch="viewport"
            className="text-sm text-text-tertiary no-underline"
          >
            ← {record.title}
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
