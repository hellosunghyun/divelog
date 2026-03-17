import { Link } from "~/components/content/SmartLink";

import type { DigestItem } from "~/db/queries/social/activity.server";

interface NarrativeDigestProps {
  items: DigestItem[];
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000;
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

export function NarrativeDigest({ items, className = "" }: NarrativeDigestProps) {
  if (items.length === 0) {
    return (
      <div
        data-testid="narrative-digest"
        className={`rounded-2xl border border-border bg-surface-secondary/40 px-6 py-8 text-center ${className}`}
      >
        <p className="text-base text-text-secondary">아직 이번 구간에서 활동이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      data-testid="narrative-digest"
      className={`rounded-2xl border border-border bg-surface px-4 sm:px-6 ${className}`}
    >
      {items.map((item) => (
        <Link
          key={`${item.type}-${item.createdAt}-${item.linkTo}`}
          to={item.linkTo}
          className="block border-b border-border-subtle py-4 last:border-b-0 no-underline group"
        >
          <p className="text-base leading-relaxed text-text-primary transition-colors group-hover:text-ocean-blue">
            {item.text}
          </p>
          <p className="mt-1 text-xs font-medium text-text-tertiary" suppressHydrationWarning>{formatRelativeTime(item.createdAt)}</p>
        </Link>
      ))}
    </div>
  );
}
