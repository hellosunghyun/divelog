import type { ActivityItem } from "../db/queries/activity.server";

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

const PERIOD_LABELS: Record<ActivityItem["period"], string> = {
  today: "오늘",
  this_week: "이번 주",
  last_week: "지난 주",
};

function TypeIcon({ type }: { type: ActivityItem["type"] }) {
  const iconClass = "w-4 h-4 text-text-tertiary";
  switch (type) {
    case "record":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
      );
    case "question":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
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
          <path d="M18 21a8 8 0 0 0-16 0" /><circle cx="10" cy="8" r="5" /><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
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
        className={`bg-surface-secondary/50 rounded-2xl p-8 text-center ${className}`}
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
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.timestamp}`}
                  className="flex items-start gap-3 py-3 px-4 bg-surface rounded-xl border border-border-subtle"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    <TypeIcon type={item.type} />
                  </span>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
