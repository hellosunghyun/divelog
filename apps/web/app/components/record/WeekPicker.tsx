import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format,
  getWeek,
  isSameDay,
} from "date-fns";

import { cn } from "~/lib/utils/utils";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface WeekPickerProps {
  selectedWeek?: { from: Date; to: Date };
  onWeekSelect: (range: { from: Date; to: Date } | undefined) => void;
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 shrink-0"
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function WeekPicker({ selectedWeek, onWeekSelect }: WeekPickerProps) {
  const handleDaySelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date) {
        onWeekSelect(undefined);
        return;
      }
      const from = startOfWeek(date, { weekStartsOn: 1 });
      const to = endOfWeek(date, { weekStartsOn: 1 });
      onWeekSelect({ from, to });
    },
    [onWeekSelect],
  );

  const modifiers = React.useMemo(() => {
    if (!selectedWeek) {
      return {};
    }

    const isWeekMiddle = (date: Date): boolean => {
      return (
        isWithinInterval(date, {
          start: selectedWeek.from,
          end: selectedWeek.to,
        }) &&
        !isSameDay(date, selectedWeek.from) &&
        !isSameDay(date, selectedWeek.to)
      );
    };

    return {
      weekStart: selectedWeek.from,
      weekEnd: selectedWeek.to,
      weekMiddle: isWeekMiddle,
    };
  }, [selectedWeek]);

  const modifiersClassNames = {
    weekStart:
      "bg-ocean-blue text-white rounded-l-md hover:bg-ocean-blue hover:text-white",
    weekEnd:
      "bg-ocean-blue text-white rounded-r-md hover:bg-ocean-blue hover:text-white",
    weekMiddle: "bg-mist-blue hover:bg-mist-blue",
  };

  const selectedDate = selectedWeek?.from;

  const displayText = selectedWeek
    ? `${format(selectedWeek.from, "yyyy년 M월", { locale: ko })} ${getWeek(selectedWeek.from, { weekStartsOn: 1, locale: ko })}주차`
    : "주를 선택하세요";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !selectedWeek && "text-text-tertiary",
          )}
        >
          <CalendarIcon />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          locale={ko}
          weekStartsOn={1}
          selected={selectedDate}
          onSelect={handleDaySelect}
          showOutsideDays
          className="p-3"
          classNames={{
            months: "flex flex-col sm:flex-row gap-2",
            month: "flex flex-col gap-4",
            month_caption: "flex justify-center pt-1 relative items-center h-7",
            caption_label: "text-sm font-medium",
            nav: "flex items-center gap-1 absolute inset-x-0 justify-between",
            button_previous: cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "hover:bg-surface-secondary hover:text-text-primary",
              "h-8 w-8 bg-transparent p-0 text-text-secondary opacity-70 hover:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
            ),
            button_next: cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "hover:bg-surface-secondary hover:text-text-primary",
              "h-8 w-8 bg-transparent p-0 text-text-secondary opacity-70 hover:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
            ),
            month_grid: "w-full border-collapse space-y-1",
            weekdays: "flex",
            weekday: "text-text-tertiary rounded-md w-11 font-normal text-[0.8rem]",
            week: "flex w-full mt-2",
            day: cn(
              "relative p-0 text-center text-sm",
              "focus-within:relative focus-within:z-20",
            ),
            day_button: cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "hover:bg-surface-secondary hover:text-text-primary",
              "h-11 w-11 p-0 font-normal",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
              "aria-selected:opacity-100",
            ),
            today: "bg-surface-secondary text-text-primary font-semibold",
            outside:
              "text-text-tertiary opacity-50 aria-selected:bg-mist-blue/20 aria-selected:text-text-tertiary",
            disabled: "text-text-tertiary opacity-50",
            hidden: "invisible",
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
