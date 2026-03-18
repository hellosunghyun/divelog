import * as React from "react";

import { cn } from "~/lib/utils/utils";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface MonthPickerProps {
  selectedMonth?: { year: number; month: number };
  onMonthSelect: (range: { from: Date; to: Date } | undefined) => void;
}

const MONTHS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

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

function ChevronLeftIcon() {
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
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function MonthPicker({ selectedMonth, onMonthSelect }: MonthPickerProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [displayYear, setDisplayYear] = React.useState(
    selectedMonth?.year ?? currentYear
  );

  const handleMonthClick = React.useCallback(
    (monthIndex: number) => {
      const from = new Date(displayYear, monthIndex, 1);
      const to = new Date(displayYear, monthIndex + 1, 0);
      onMonthSelect({ from, to });
    },
    [displayYear, onMonthSelect]
  );

  const handlePrevYear = React.useCallback(() => {
    setDisplayYear((y) => y - 1);
  }, []);

  const handleNextYear = React.useCallback(() => {
    setDisplayYear((y) => y + 1);
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, monthIndex: number) => {
      const monthButtons = document.querySelectorAll<HTMLButtonElement>(
        '[data-month-gridcell="true"]'
      );
      const currentIndex = monthIndex;
      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowLeft":
          nextIndex = currentIndex > 0 ? currentIndex - 1 : 11;
          break;
        case "ArrowRight":
          nextIndex = currentIndex < 11 ? currentIndex + 1 : 0;
          break;
        case "ArrowUp":
          nextIndex = currentIndex >= 3 ? currentIndex - 3 : currentIndex + 9;
          break;
        case "ArrowDown":
          nextIndex = currentIndex <= 8 ? currentIndex + 3 : currentIndex - 9;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleMonthClick(monthIndex);
          return;
        default:
          return;
      }

      e.preventDefault();
      monthButtons[nextIndex]?.focus();
    },
    [handleMonthClick]
  );

  const displayText = selectedMonth
    ? `${selectedMonth.year}년 ${selectedMonth.month}월`
    : "월을 선택하세요";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-[200px] justify-start text-left font-normal",
            !selectedMonth && "text-text-tertiary"
          )}
        >
          <CalendarIcon />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevYear}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                "hover:bg-surface-secondary hover:text-text-primary",
                "h-7 w-7 p-0 text-text-secondary"
              )}
              aria-label={`${displayYear - 1}년으로 이동`}
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-sm font-semibold text-text-primary">
              {displayYear}년
            </span>
            <button
              type="button"
              onClick={handleNextYear}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                "hover:bg-surface-secondary hover:text-text-primary",
                "h-7 w-7 p-0 text-text-secondary"
              )}
              aria-label={`${displayYear + 1}년으로 이동`}
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div
            role="grid"
            aria-label={`${displayYear}년 월 선택`}
            className="grid grid-cols-3 gap-1"
          >
            {MONTHS.map((label, idx) => {
              const monthNum = idx + 1;
              const isSelected =
                selectedMonth?.year === displayYear &&
                selectedMonth?.month === monthNum;
              const isCurrentMonth =
                currentYear === displayYear && currentMonth === monthNum;

              return (
                <button
                  key={label}
                  type="button"
                  data-month-gridcell="true"
                  aria-label={`${displayYear}년 ${label}${isSelected ? " (선택됨)" : ""}`}
                  onClick={() => handleMonthClick(idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
                    isSelected
                      ? "bg-ocean-blue text-white hover:bg-ocean-blue"
                      : isCurrentMonth
                        ? "bg-surface-secondary font-semibold text-text-primary hover:bg-surface-secondary"
                        : "text-text-primary hover:bg-surface-secondary"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
