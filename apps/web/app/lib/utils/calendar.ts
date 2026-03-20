export type RecordItem = {
  id: string;
  slug: string;
  title: string;
  format: "note" | "article";
  createdAt: number;
  contentSnippet?: string;
  author?: {
    displayName: string | null;
    slug: string | null;
    profilePhotoUrl?: string | null;
  } | null;
};

export type CalendarDay = {
  date: Date;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  records: RecordItem[];
};

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDayOfMonth.getDay();
  const visibleDays = leadingDays + daysInMonth;
  const totalCells = visibleDays <= 35 ? 35 : 42;
  const calendarStartDate = new Date(year, month, 1 - leadingDays);
  const today = new Date();

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);

    return {
      date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: isSameLocalDate(date, today),
      records: [],
    };
  });
}

export function getRecordsForMonth(
  records: RecordItem[],
  year: number,
  month: number,
): Map<number, RecordItem[]> {
  const recordsByDay = new Map<number, RecordItem[]>();

  for (const record of records) {
    const recordDate = new Date(record.createdAt * 1000);

    if (recordDate.getFullYear() !== year || recordDate.getMonth() !== month) {
      continue;
    }

    const day = recordDate.getDate();
    const existingRecords = recordsByDay.get(day);

    if (existingRecords) {
      existingRecords.push(record);
      continue;
    }

    recordsByDay.set(day, [record]);
  }

  return recordsByDay;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}년 ${month + 1}월`;
}
