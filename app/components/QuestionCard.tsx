import { Link } from "react-router";

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
      className="rounded-lg border border-border bg-surface p-6 lg:p-7 shadow-sm"
    >
      <div className="text-sm text-ocean-blue mb-4 font-medium">
        {question.direction === "inward" ? "나에게 묻다" : "함께 생각해볼 질문"}
      </div>

      <p className="text-xl leading-relaxed text-text-primary font-semibold mb-6">
        {question.content}
      </p>

      {record && (
        <div className="mb-4">
          <Link
            to={`/logs/${record.slug}`}
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
          className="rounded-md px-4 py-2 text-sm border border-border bg-transparent text-text-secondary cursor-pointer transition-all duration-fast"
        >
          이 질문에 응답하기
        </button>
      )}
    </article>
  );
}
