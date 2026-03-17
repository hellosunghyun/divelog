export interface RecordWithCreatedAt {
  createdAt: number;
}

export interface DateGroup<TRecord extends RecordWithCreatedAt> {
  key: string;
  label: string;
  records: TRecord[];
  priority: number;
  latestTimestamp: number;
}

const PERIOD_LABELS = {
  today: "오늘",
  yesterday: "어제",
  thisWeek: "이번 주",
  lastWeek: "지난 주",
} as const;

function startOfDay(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function startOfWeek(date: Date): Date {
  const weekStart = startOfDay(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  return weekStart;
}

function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function groupRecordsByDate<TRecord extends RecordWithCreatedAt>(
  records: TRecord[],
  nowInput?: Date,
): DateGroup<TRecord>[] {
  const now = nowInput ? new Date(nowInput) : new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const grouped = new Map<string, DateGroup<TRecord>>();

  for (const record of records) {
    const recordDate = new Date(record.createdAt * 1000);
    const timestamp = recordDate.getTime();

    let key: string;
    let label: string;
    let priority: number;

    if (recordDate >= todayStart) {
      key = "today";
      label = PERIOD_LABELS.today;
      priority = 0;
    } else if (recordDate >= yesterdayStart) {
      key = "yesterday";
      label = PERIOD_LABELS.yesterday;
      priority = 1;
    } else if (recordDate >= thisWeekStart) {
      key = "thisWeek";
      label = PERIOD_LABELS.thisWeek;
      priority = 2;
    } else if (recordDate >= lastWeekStart) {
      key = "lastWeek";
      label = PERIOD_LABELS.lastWeek;
      priority = 3;
    } else {
      const month = monthKey(recordDate);
      key = `month-${month}`;
      label = monthLabel(recordDate);
      priority = 4;
    }

    const existing = grouped.get(key);
    if (existing) {
      existing.records.push(record);
      if (timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = timestamp;
      }
      continue;
    }

    grouped.set(key, {
      key,
      label,
      records: [record],
      priority,
      latestTimestamp: timestamp,
    });
  }

  const groups = Array.from(grouped.values());

  for (const group of groups) {
    group.records.sort((a, b) => b.createdAt - a.createdAt);
  }

  return groups.sort((a, b) => {
    const aIsMonthGroup = a.key.startsWith("month-");
    const bIsMonthGroup = b.key.startsWith("month-");

    if (!aIsMonthGroup && !bIsMonthGroup) {
      return a.priority - b.priority;
    }

    if (!aIsMonthGroup) return -1;
    if (!bIsMonthGroup) return 1;

    return b.latestTimestamp - a.latestTimestamp;
  });
}
