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
      className="rounded-lg border border-border bg-surface p-6 shadow-sm border-l-[3px] border-l-reef-cyan flex flex-col gap-3"
    >
      <p className="text-lg leading-relaxed text-text-primary italic">
        "{sentence.content}"
      </p>
      {sentence.reason && (
        <p className="text-meta text-text-secondary">
          {sentence.reason}
        </p>
      )}
      <div className="flex gap-4 text-meta text-text-tertiary">
        {savedBy && <Link to={`/learners/${savedBy.slug}`}>{savedBy.displayName}</Link>}
        {record && <Link to={`/logs/${record.slug}`}>← {record.title}</Link>}
      </div>
    </blockquote>
  );
}
