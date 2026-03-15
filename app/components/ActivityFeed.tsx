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

const TYPE_ICONS: Record<ActivityItem["type"], string> = {
  record: "📝",
  question: "❓",
  response: "💬",
  collaboration: "🤝",
};

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
                  <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
                    {TYPE_ICONS[item.type]}
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
