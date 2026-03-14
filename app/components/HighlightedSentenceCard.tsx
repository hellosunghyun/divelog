import { Link } from "react-router";

interface HighlightedSentenceCardProps {
  sentence: {
    id: string;
    content: string;
    reason?: string | null;
  };
  savedBy?: {
    displayName: string;
    slug: string;
  };
  record?: {
    slug: string;
    title: string;
  };
}

export default function HighlightedSentenceCard({ sentence, savedBy, record }: HighlightedSentenceCardProps) {
  return (
    <blockquote
      data-testid="sentence-card"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        borderLeft: "3px solid var(--color-reef-cyan)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <p style={{
        fontSize: "var(--font-size-lg)",
        lineHeight: "var(--line-height-relaxed)",
        color: "var(--color-text-primary)",
        fontStyle: "italic",
      }}>
        "{sentence.content}"
      </p>
      {sentence.reason && (
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {sentence.reason}
        </p>
      )}
      <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "13px", color: "var(--color-text-tertiary)" }}>
        {savedBy && <Link to={`/learners/${savedBy.slug}`}>{savedBy.displayName}</Link>}
        {record && <Link to={`/logs/${record.slug}`}>← {record.title}</Link>}
      </div>
    </blockquote>
  );
}
