import { Link } from "~/components/SmartLink";

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
      className="rounded-2xl border border-border bg-surface p-6 shadow-card flex flex-col gap-3 transition-all duration-normal hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className="h-0.5 rounded-full bg-reef-cyan/40 w-12" />
      <p className="text-xl md:text-2xl leading-relaxed text-text-primary italic tracking-tight">
        "{sentence.content}"
      </p>
      {sentence.reason && (
        <p className="text-meta text-text-secondary">
          {sentence.reason}
        </p>
      )}
      <div className="flex gap-4 text-meta text-text-tertiary">
        {savedBy && <Link to={`/learners/${savedBy.slug}`} prefetch="viewport" className="no-underline hover:text-ocean-blue transition-colors">{savedBy.displayName}</Link>}
        {record && <Link to={`/logs/${record.slug}`} prefetch="viewport" className="no-underline hover:text-ocean-blue transition-colors">← {record.title}</Link>}
      </div>
    </blockquote>
  );
}
