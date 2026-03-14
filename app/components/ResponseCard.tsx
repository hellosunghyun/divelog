import { Link } from "react-router";

type ResponseType = "resonance" | "question" | "connection" | "suggestion" | "self_answer";

interface ResponseCardProps {
  response: {
    id: string;
    type: ResponseType;
    content: string;
    createdAt: number;
  };
  author?: {
    displayName: string;
    slug: string;
  };
  isSelfAnswer?: boolean;
}

const TYPE_LABELS: Record<ResponseType, { label: string; color: string }> = {
  resonance: { label: "공명", color: "var(--color-prelude)" },
  question: { label: "질문", color: "var(--color-ocean-blue)" },
  connection: { label: "연결", color: "var(--color-bridge)" },
  suggestion: { label: "제안", color: "var(--color-challenge)" },
  self_answer: { label: "자기답변", color: "var(--color-epilogue)" },
};

export default function ResponseCard({ response, author, isSelfAnswer }: ResponseCardProps) {
  const typeInfo = TYPE_LABELS[response.type] ?? {
    label: response.type,
    color: "var(--color-text-secondary)",
  };

  return (
    <article
      data-testid="response-card"
      style={{
        backgroundColor: isSelfAnswer ? "var(--color-mist-blue)" : "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${isSelfAnswer ? "var(--color-reef-cyan)" : "var(--color-border)"}`,
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "12px",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            backgroundColor: `color-mix(in srgb, ${typeInfo.color} 12%, transparent)`,
            color: typeInfo.color,
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          {typeInfo.label}
        </span>
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            style={{
              fontSize: "13px",
              color: "var(--color-text-tertiary)",
              textDecoration: "none",
            }}
          >
            {author.displayName}
          </Link>
        )}
      </div>

      <p
        style={{
          fontSize: "var(--font-size-base)",
          lineHeight: "var(--line-height-normal)",
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {response.content}
      </p>
    </article>
  );
}
