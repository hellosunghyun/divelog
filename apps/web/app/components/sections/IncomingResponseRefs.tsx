import { Link } from "react-router";
import { cn } from "~/lib/utils/utils";
import type { IncomingResponseRef } from "~/db/queries/dialogue/responseRecordRefs.server";

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  resonance: { label: "공명", className: "bg-reef-cyan/20 text-teal-700" },
  question: { label: "질문", className: "bg-ocean-blue/15 text-ocean-blue" },
  connection: { label: "연결", className: "bg-mist-blue/50 text-ocean-blue/80" },
  suggestion: { label: "제안", className: "bg-deep-ocean/10 text-deep-ocean/80" },
  self_answer: { label: "자기답변", className: "bg-ocean-blue/15 text-ocean-blue" },
};

interface IncomingResponseRefsProps {
  refs: IncomingResponseRef[];
}

export function IncomingResponseRefs({ refs }: IncomingResponseRefsProps) {
  if (refs.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-text-primary mb-4">이 글을 언급한 응답</h2>
      <div className="space-y-3">
        {refs.map((ref) => {
          const typeConfig = TYPE_CONFIG[ref.responseType] ?? {
            label: ref.responseType,
            className: "bg-surface-secondary text-text-secondary",
          };

          return (
            <div
              key={ref.responseId}
              className="border border-border rounded-2xl p-4 bg-surface"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    typeConfig.className,
                  )}
                >
                  {typeConfig.label}
                </span>

                <Link
                  to={`/learners/${ref.authorSlug}`}
                  className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {ref.authorPhotoUrl ? (
                    <img
                      src={ref.authorPhotoUrl}
                      alt={ref.authorDisplayName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-medium text-text-secondary">
                      {ref.authorDisplayName.charAt(0)}
                    </span>
                  )}
                  <span>{ref.authorDisplayName}</span>
                </Link>

                <span className="text-text-tertiary text-xs">in</span>
                <Link
                  to={`/logs/${ref.sourceRecordSlug}`}
                  className="text-xs text-ocean-blue hover:underline truncate max-w-[200px]"
                >
                  {ref.sourceRecordTitle}
                </Link>
              </div>

              {ref.contentExcerpt && (
                <p className="text-sm text-text-secondary line-clamp-2">
                  {ref.contentExcerpt}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
