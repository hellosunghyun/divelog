import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

type CompactTimelineCardProps = {
  slug: string;
  title: string;
  contentSnippet?: string | null;
  format: "note" | "article";
  createdAt: number;
  isRead?: boolean;
  className?: string;
};

const FORMAT_LABELS: Record<"note" | "article", string> = {
  note: "노트",
  article: "글",
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
  createdAt,
  isRead,
  className,
}: CompactTimelineCardProps) {
  return (
    <Link
      to={`/logs/${slug}`}
      data-read={isRead ? "true" : undefined}
      className={cn(
        "block rounded-2xl border shadow-card",
        "px-5 py-4",
        "hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-150",
        "no-underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2",
        isRead
          ? "bg-[#F0F2F5] border-[#D8DCE3]"
          : "bg-surface border-subtle",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isRead
              ? "bg-[#E0E3E8] text-[#8C8F96]"
              : format === "note"
                ? "bg-mist-blue/60 text-ocean-blue"
                : "bg-surface-secondary text-text-secondary"
          )}
        >
          {FORMAT_LABELS[format]}
        </span>
        <span
          className={cn(
            "text-xs",
            isRead ? "text-[#A0A4AB]" : "text-text-tertiary"
          )}
          suppressHydrationWarning
        >
          {formatRelativeTime(createdAt)}
        </span>
      </div>

      <p className={cn(
        "text-base font-semibold tracking-tight m-0",
        isRead ? "text-text-tertiary" : "text-text-primary"
      )}>
        {title}
      </p>

      {contentSnippet && (
        <p className={cn(
          "text-sm line-clamp-3 mt-1.5 m-0 leading-relaxed",
          isRead ? "text-[#A0A4AB]" : "text-text-secondary"
        )}>
          {contentSnippet}
        </p>
      )}
    </Link>
  );
}
