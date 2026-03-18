import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";
import { motion } from "~/lib/motion/motion";


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
    <motion.article
      data-testid="sentence-card"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "group bg-surface ring-1 ring-border rounded-2xl p-6 md:p-8 relative overflow-hidden",
        "hover:shadow-tinted-md transition-premium cursor-pointer"
      )}
    >
      <span
        className="absolute -top-3 left-4 text-7xl leading-none text-text-tertiary/20 font-serif select-none pointer-events-none"
        aria-hidden="true"
      >
        "
      </span>

      <blockquote className="relative z-10">
        <p className="text-xl md:text-2xl font-medium leading-relaxed text-text-primary tracking-tight pt-4">
          {sentence.content}
        </p>
      </blockquote>

      {sentence.reason && (
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          {sentence.reason}
        </p>
      )}

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
        {savedBy && (
          <Link
            to={`/learners/${savedBy.slug}`}
            prefetch="viewport"
            className="text-xs text-text-tertiary no-underline hover:text-ocean-blue transition-colors"
          >
            — {savedBy.displayName}
          </Link>
        )}
        {record && (
          <Link
            to={`/logs/${record.slug}`}
            prefetch="viewport"
            className="text-xs text-text-tertiary no-underline hover:text-ocean-blue transition-colors ml-auto"
          >
            ← {record.title}
          </Link>
        )}
      </div>
    </motion.article>
  );
}
