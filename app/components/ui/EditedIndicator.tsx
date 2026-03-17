import { cn } from "~/lib/utils/utils";

interface EditedIndicatorProps {
  createdAt: number; // unix seconds
  updatedAt: number; // unix seconds
  className?: string;
}

/**
 * Format a Unix timestamp as a relative time string in Korean.
 */
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

  return new Date(timestamp * 1000).toLocaleDateString("ko-KR");
}

/**
 * A subtle indicator showing when a record has been edited.
 * Returns null if updatedAt is within 60 seconds of createdAt.
 *
 * Design: Quiet Depth — very quiet supplementary text, not intrusive.
 * - text-xs (12px), font-medium (500)
 * - text-text-tertiary (#8C8C91)
 * - No icons, no background, no badge styling
 */
export function EditedIndicator({
  createdAt,
  updatedAt,
  className,
}: EditedIndicatorProps) {
  // 1-minute threshold to avoid showing "edited" for near-instant saves
  const EDIT_THRESHOLD_SECONDS = 60;

  if (updatedAt <= createdAt + EDIT_THRESHOLD_SECONDS) {
    return null;
  }

  return (
    <span
      className={cn(
        "text-text-tertiary text-xs font-medium leading-relaxed",
        className
      )}
      title={new Date(updatedAt * 1000).toLocaleString("ko-KR")}
    >
      수정됨 · {formatRelativeTime(updatedAt)}
    </span>
  );
}
