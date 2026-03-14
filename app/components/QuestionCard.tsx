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
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-8)",
        paddingTop: "var(--space-10)",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-ocean-blue)",
          marginBottom: "var(--space-4)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        {question.direction === "inward" ? "나에게 묻다" : "함께 생각해볼 질문"}
      </div>

      <p
        style={{
          fontSize: "var(--font-size-xl)",
          lineHeight: "var(--line-height-relaxed)",
          color: "var(--color-text-primary)",
          fontWeight: "var(--font-weight-medium)",
          marginBottom: "var(--space-6)",
        }}
      >
        {question.content}
      </p>

      {record && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Link
            to={`/logs/${record.slug}`}
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-tertiary)",
              textDecoration: "none",
            }}
          >
            ← {record.title}
          </Link>
        </div>
      )}

      {question.isOpen !== false && onRespond && (
        <button
          type="button"
          onClick={onRespond}
          style={{
            fontSize: "var(--font-size-sm)",
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-default)",
          }}
        >
          이 질문에 응답하기
        </button>
      )}
    </article>
  );
}
