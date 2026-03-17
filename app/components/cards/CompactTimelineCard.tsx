import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

type CompactTimelineCardProps = {
  slug: string;
  title: string;
  contentSnippet?: string | null;
  format: "note" | "article";
  stageType?: "prelude" | "bridge" | "challenge" | "epilogue" | null;
  createdAt: number;
  className?: string;
};

const FORMAT_LABELS: Record<"note" | "article", string> = {
  note: "노트",
  article: "글",
};

const stageAccentClasses: Record<string, string> = {
  prelude: "bg-mist-blue-deep",
  bridge: "bg-reef-cyan",
  challenge: "bg-deep-ocean",
  epilogue: "bg-border",
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function CompactTimelineCard({
  slug,
  title,
  contentSnippet,
  format,
  stageType,
  createdAt,
  className,
}: CompactTimelineCardProps) {
  const accentClass = stageType ? stageAccentClasses[stageType] : "bg-border";

  return (
    <Link
      to={`/logs/${slug}`}
      className={cn(
        "relative flex items-stretch rounded-lg border border-subtle bg-surface",
        "hover:bg-surface-secondary transition-colors no-underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2",
        className
      )}
    >
      <span
        className={cn("w-1 rounded-l-lg flex-shrink-0", accentClass)}
        aria-hidden="true"
      />

      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded",
              format === "note"
                ? "bg-mist-blue/60 text-ocean-blue"
                : "bg-surface-secondary text-secondary"
            )}
          >
            {FORMAT_LABELS[format]}
          </span>
          <span className="text-[11px] text-tertiary" suppressHydrationWarning>
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        <p className="text-sm font-semibold text-primary line-clamp-1 mt-0.5 m-0 tracking-tight">
          {title}
        </p>

        {contentSnippet && (
          <p className="text-xs text-secondary line-clamp-2 mt-0.5 m-0 leading-relaxed">
            {contentSnippet}
          </p>
        )}
      </div>
    </Link>
  );
}
