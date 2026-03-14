import { Link } from "react-router";

interface SceneCardProps {
  record: {
    slug: string;
    title: string;
    content: string;
    format: "note" | "article";
    type: "personal" | "challenge" | "collaboration";
    rhythm?: string;
    createdAt: number;
  };
  author?: {
    displayName: string;
    slug: string;
  };
  stage?: {
    name: string;
    type: string;
  };
  hasQuestions?: boolean;
  hasSelfAnswers?: boolean;
  hasLinkedRecord?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  note: "노트",
  article: "글",
};

const RHYTHM_LABELS: Record<string, string> = {
  sprint: "스프린트",
  weekly: "주간",
  monthly: "월간",
  free: "자유",
};

export default function SceneCard({
  record,
  author,
  stage,
  hasQuestions,
  hasSelfAnswers,
  hasLinkedRecord,
}: SceneCardProps) {
  const snippet =
    record.content.substring(0, 120) +
    (record.content.length > 120 ? "…" : "");

  return (
    <article
      data-testid="scene-card"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {/* Stage + Format badges */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {stage && (
          <span
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-mist-blue)",
              color: "var(--color-ocean-blue)",
            }}
          >
            {stage.name}
          </span>
        )}
        <span
          style={{
            fontSize: "12px",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          {FORMAT_LABELS[record.format] ?? record.format}
        </span>
        {record.rhythm && record.rhythm !== "free" && (
          <span
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {RHYTHM_LABELS[record.rhythm] ?? record.rhythm}
          </span>
        )}
      </div>

      {/* Title */}
      <Link
        to={`/logs/${record.slug}`}
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text-primary)",
          lineHeight: "var(--line-height-tight)",
          textDecoration: "none",
        }}
      >
        <h3>{record.title}</h3>
      </Link>

      {/* Snippet */}
      <p
        style={{
          fontSize: "var(--font-size-base)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-normal)",
          margin: 0,
        }}
      >
        {snippet}
      </p>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "var(--space-2)",
        }}
      >
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            {author.displayName}
          </Link>
        )}

        {/* Indicator icons */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginLeft: author ? "auto" : 0,
          }}
        >
          {hasQuestions && (
            <span
              title="열린 질문 있음"
              style={{
                fontSize: "12px",
                color: "var(--color-ocean-blue)",
              }}
              role="img"
              aria-label="열린 질문 있음"
            >
              ?
            </span>
          )}
          {hasSelfAnswers && (
            <span
              title="자기답변 있음"
              style={{
                fontSize: "12px",
                color: "var(--color-bridge)",
              }}
              role="img"
              aria-label="자기답변 있음"
            >
              ↩
            </span>
          )}
          {hasLinkedRecord && (
            <span
              title="이어진 기록 있음"
              style={{
                fontSize: "12px",
                color: "var(--color-text-tertiary)",
              }}
              role="img"
              aria-label="이어진 기록 있음"
            >
              →
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
