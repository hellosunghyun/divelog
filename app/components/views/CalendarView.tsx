import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Link } from "~/components/content/SmartLink";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { cn } from "~/lib/utils/cn";
import {
  type RecordItem,
  type CalendarDay,
  getCalendarDays,
  getRecordsForMonth,
  formatMonthLabel,
} from "~/lib/utils/calendar";

type CalendarViewProps = {
  records: RecordItem[];
  month: string;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const FORMAT_DOT_COLORS: Record<"note" | "article", string> = {
  note: "bg-reef-cyan",
  article: "bg-ocean-blue",
};

const FORMAT_LABELS: Record<"note" | "article", string> = {
  note: "노트",
  article: "글",
};

function parseMonthString(monthStr: string): { year: number; month: number } {
  const [year, month] = monthStr.split("-").map(Number);
  return { year, month: month - 1 };
}

function formatMonthPath(year: number, month: number): string {
  const monthStr = String(month + 1).padStart(2, "0");
  return `${year}-${monthStr}`;
}

function CalendarCell({
  day,
  recordsForDay,
  isMobile,
  onCellClick,
  isExpanded,
}: {
  day: CalendarDay;
  recordsForDay: RecordItem[];
  isMobile: boolean;
  onCellClick: () => void;
  isExpanded: boolean;
}) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const hasRecords = recordsForDay.length > 0;
  const displayRecords = recordsForDay.slice(0, 3);
  const remainingCount = recordsForDay.length - 3;

  if (!day.isCurrentMonth) {
    return (
      <div className="min-h-[60px] md:min-h-[80px] p-1.5 border-r border-b border-border bg-surface-secondary/30">
        <span className="text-sm text-tertiary opacity-50">{day.day}</span>
      </div>
    );
  }

  const cellContent = (
    <div
      className={cn(
        "min-h-[60px] md:min-h-[80px] p-1.5 border-r border-b border-border relative",
        "bg-surface hover:bg-surface-secondary/50 transition-colors",
        isExpanded && "bg-surface-secondary"
      )}
    >
      <div className="flex justify-end mb-1">
        {day.isToday ? (
          <span className="w-6 h-6 flex items-center justify-center text-sm font-medium bg-ocean-blue text-white rounded-full">
            {day.day}
          </span>
        ) : (
          <span className="text-sm text-primary">{day.day}</span>
        )}
      </div>

      {hasRecords && (
        <div className="flex flex-wrap gap-1 items-center">
          {displayRecords.map((record) => (
            <span
              key={record.id}
              className={cn("w-2 h-2 rounded-full", FORMAT_DOT_COLORS[record.format])}
              aria-hidden="true"
            />
          ))}
          {remainingCount > 0 && (
            <span className="text-[10px] text-tertiary">+{remainingCount}</span>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile && hasRecords) {
    return (
      <button
        type="button"
        onClick={onCellClick}
        className={cn(
          "w-full text-left appearance-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-inset"
        )}
        aria-expanded={isExpanded}
      >
        {cellContent}
      </button>
    );
  }

  if (!isMobile && hasRecords) {
    return (
      <Popover open={isHoverOpen} onOpenChange={setIsHoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseEnter={() => setIsHoverOpen(true)}
            onMouseLeave={() => setIsHoverOpen(false)}
            className={cn(
              "w-full text-left appearance-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-inset"
            )}
          >
            {cellContent}
          </button>
        </PopoverTrigger>
        <PopoverContent
          onMouseEnter={() => setIsHoverOpen(true)}
          onMouseLeave={() => setIsHoverOpen(false)}
          className="w-72 p-2 max-h-80 overflow-y-auto"
          align="start"
          side="right"
          sideOffset={8}
        >
          <div className="space-y-1">
            {recordsForDay.slice(0, 5).map((record) => (
              <Link
                key={record.id}
                to={`/logs/${record.slug}`}
                className="block py-2 px-2 rounded-md no-underline hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      record.format === "note" ? "text-ocean-blue" : "text-secondary"
                    )}
                  >
                    {FORMAT_LABELS[record.format]}
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary line-clamp-1">
                  {record.title}
                </div>
                {record.contentSnippet && (
                  <div className="text-xs text-secondary line-clamp-2 mt-0.5">
                    {record.contentSnippet}
                  </div>
                )}
              </Link>
            ))}
            {recordsForDay.length > 5 && (
              <div className="text-xs text-tertiary text-center py-1">
                외 {recordsForDay.length - 5}개
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return cellContent;
}

export default function CalendarView({ records, month }: CalendarViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { year, month: monthIndex } = parseMonthString(month);
  const calendarDays = getCalendarDays(year, monthIndex);
  const recordsByDay = getRecordsForMonth(records, year, monthIndex);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function handlePrevMonth() {
    const newDate = new Date(year, monthIndex - 1, 1);
    const newMonthStr = formatMonthPath(newDate.getFullYear(), newDate.getMonth());
    const newParams = new URLSearchParams(searchParams);
    newParams.set("month", newMonthStr);
    navigate(`/logs?${newParams.toString()}`);
  }

  function handleNextMonth() {
    const newDate = new Date(year, monthIndex + 1, 1);
    const newMonthStr = formatMonthPath(newDate.getFullYear(), newDate.getMonth());
    const newParams = new URLSearchParams(searchParams);
    newParams.set("month", newMonthStr);
    navigate(`/logs?${newParams.toString()}`);
  }

  function handleCellClick(day: number) {
    setExpandedDay((prev) => (prev === day ? null : day));
  }

  const expandedDayRecords = expandedDay !== null ? recordsByDay.get(expandedDay) : null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "px-3 py-2 text-sm font-medium text-secondary",
            "hover:text-primary hover:bg-surface-secondary rounded-lg",
            "transition-colors focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          )}
          aria-label="이전 달"
        >
          ← 이전
        </button>
        <h2 className="text-xl font-semibold text-primary">
          {formatMonthLabel(year, monthIndex)}
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "px-3 py-2 text-sm font-medium text-secondary",
            "hover:text-primary hover:bg-surface-secondary rounded-lg",
            "transition-colors focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          )}
          aria-label="다음 달"
        >
          다음 →
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-center text-caption text-tertiary py-2 text-sm font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-border rounded-xl overflow-hidden">
        {calendarDays.map((day) => (
          <CalendarCell
            key={`${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`}
            day={day}
            recordsForDay={day.isCurrentMonth ? (recordsByDay.get(day.day) ?? []) : []}
            isMobile={isMobile}
            onCellClick={() => handleCellClick(day.day)}
            isExpanded={expandedDay === day.day}
          />
        ))}
      </div>

      {expandedDayRecords && expandedDayRecords.length > 0 && (
        <div className="md:hidden mt-4 space-y-2">
          <div className="text-sm font-medium text-secondary mb-2">
            {monthIndex + 1}월 {expandedDay}일 기록
          </div>
          {expandedDayRecords.map((record) => (
            <Link
              key={record.id}
              to={`/logs/${record.slug}`}
              className="block p-3 rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-colors no-underline"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[11px] font-medium px-1.5 py-0.5 rounded",
                    record.format === "note"
                      ? "bg-mist-blue/60 text-ocean-blue"
                      : "bg-surface-secondary text-secondary"
                  )}
                >
                  {FORMAT_LABELS[record.format]}
                </span>
              </div>
              <div className="text-sm font-semibold text-primary line-clamp-1">
                {record.title}
              </div>
              {record.contentSnippet && (
                <div className="text-xs text-secondary line-clamp-2 mt-0.5">
                  {record.contentSnippet}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {recordsByDay.size === 0 && (
        <div className="mt-8 text-center py-12">
          <p className="text-sm text-tertiary">이 달에 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
