import type { ActivityItem } from "../../db/queries/social/activity.server";
import { cn } from "~/lib/utils/cn";

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

const PERIOD_LABELS: Record<ActivityItem["period"], string> = {
  today: "오늘",
  this_week: "이번 주",
  last_week: "지난 주",
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
  if (days < 14) return "지난 주";
  return `${Math.floor(days / 7)}주 전`;
}

function TypeIcon({ type }: { type: ActivityItem["type"] }) {
  const iconClass = "w-4 h-4 text-ocean-blue";

  switch (type) {
    case "record":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
      );
    case "question":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "response":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
      );
    case "collaboration":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 21a8 8 0 0 0-16 0" />
          <circle cx="10" cy="8" r="5" />
          <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
        </svg>
      );
    default:
      return null;
  }
}

function groupByPeriod(activities: ActivityItem[]): Map<ActivityItem["period"], ActivityItem[]> {
  const groups = new Map<ActivityItem["period"], ActivityItem[]>();

  for (const activity of activities) {
    const existing = groups.get(activity.period) ?? [];
    existing.push(activity);
    groups.set(activity.period, existing);
  }

  return groups;
}

export default function ActivityFeed({ activities, className = "" }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div
        data-testid="activity-feed"
        className={cn(
          "bg-surface-secondary/50 rounded-2xl p-8 text-center",
          className
        )}
      >
        <p className="text-text-secondary text-base">여정이 조용합니다</p>
        <p className="text-text-tertiary text-sm mt-2">새로운 활동이 있으면 여기에 표시됩니다.</p>
      </div>
    );
  }

  const groupedActivities = groupByPeriod(activities);
  const periodOrder: ActivityItem["period"][] = ["today", "this_week", "last_week"];

  return (
    <div data-testid="activity-feed" className={className}>
      {periodOrder.map((period) => {
        const items = groupedActivities.get(period);
        if (!items || items.length === 0) return null;

        return (
          <div key={period} className="mb-6 last:mb-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-3">
              {PERIOD_LABELS[period]}
            </h3>
            <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.timestamp}`}
                  className="flex gap-3 py-3 px-4 items-start hover:bg-surface-secondary/50 transition-colors duration-normal"
                >
                  <div className="w-8 h-8 rounded-full bg-mist-blue flex items-center justify-center flex-shrink-0">
                    <TypeIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-relaxed">
                      {item.summary}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5" suppressHydrationWarning>
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
