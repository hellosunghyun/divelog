import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

import { MonthPicker } from "~/components/record/MonthPicker";
import { StageDatePicker } from "~/components/record/StageDatePicker";
import { WeekPicker } from "~/components/record/WeekPicker";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils/utils";

interface Stage {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate?: number | null;
  endDate?: number | null;
}

interface RhythmDateInputProps {
  rhythm: string;
  stages?: Stage[];
  initialValues?: {
    recordedAt?: string;
    recordedEndAt?: string;
    stageId?: string;
  };
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

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function RhythmDateInput({
  rhythm,
  stages = [],
  initialValues,
}: RhythmDateInputProps) {
  const initialRecordedAt = parseDate(initialValues?.recordedAt);
  const initialRecordedEndAt = parseDate(initialValues?.recordedEndAt);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialValues?.recordedAt
      ? new Date(`${initialValues.recordedAt}T00:00:00`)
      : undefined,
  );
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >(
    initialRecordedAt
      ? {
          from: initialRecordedAt,
          to: initialRecordedEndAt ?? initialRecordedAt,
        }
      : undefined,
  );
  const [stageDateValue, setStageDateValue] = useState<{
    recordedAt?: string;
    recordedEndAt?: string;
    stageId?: string;
  }>({
    recordedAt: initialValues?.recordedAt,
    recordedEndAt: initialValues?.recordedEndAt,
    stageId: initialValues?.stageId,
  });
  const prevRhythmRef = useRef(rhythm);

  useEffect(() => {
    if (prevRhythmRef.current === rhythm) {
      return;
    }

    prevRhythmRef.current = rhythm;
    setSelectedDate(undefined);
    setDateRange(undefined);
    setStageDateValue({});
  }, [rhythm]);

  const monthlySelection =
    dateRange?.from != null
      ? {
          year: dateRange.from.getFullYear(),
          month: dateRange.from.getMonth() + 1,
        }
      : undefined;

  const recordedAtValue = (() => {
    switch (rhythm) {
      case "free":
      case "sprint":
      case "reflection":
        return selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
      case "weekly":
      case "monthly":
        return dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
      case "stage":
        return stageDateValue.recordedAt ?? "";
      case "moment":
      default:
        return "";
    }
  })();

  const recordedEndAtValue = (() => {
    switch (rhythm) {
      case "weekly":
      case "monthly":
        return dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";
      case "stage":
        return stageDateValue.recordedEndAt ?? "";
      default:
        return "";
    }
  })();

  const isSingleDateRhythm =
    rhythm === "free" || rhythm === "sprint" || rhythm === "reflection";

  return (
    <>
      {isSingleDateRhythm && (
        <div>
          <Label className="mb-2 block text-meta font-medium text-text-secondary">
            기록 날짜
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-text-tertiary",
                )}
              >
                <CalendarIcon />
                {selectedDate
                  ? format(selectedDate, "yyyy년 M월 d일", { locale: ko })
                  : "날짜를 선택하세요"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {rhythm === "moment" && (
        <p className="text-sm text-text-secondary">
          순간의 기록은 날짜를 지정하지 않습니다
        </p>
      )}

      {rhythm === "weekly" && (
        <div>
          <Label className="mb-2 block text-meta font-medium text-text-secondary">
            주 선택
          </Label>
          <WeekPicker
            selectedWeek={dateRange}
            onWeekSelect={(range) => setDateRange(range)}
          />
        </div>
      )}

      {rhythm === "monthly" && (
        <div>
          <Label className="mb-2 block text-meta font-medium text-text-secondary">
            월 선택
          </Label>
          <MonthPicker
            selectedMonth={monthlySelection}
            onMonthSelect={(range) => setDateRange(range)}
          />
        </div>
      )}

      {rhythm === "stage" && (
        <div>
          <Label className="mb-2 block text-meta font-medium text-text-secondary">
            기간 선택
          </Label>
          <StageDatePicker
            stages={stages}
            value={stageDateValue}
            onSelect={(value) => setStageDateValue(value)}
          />
        </div>
      )}

      <input type="hidden" name="recordedAt" value={recordedAtValue} />
      <input type="hidden" name="recordedEndAt" value={recordedEndAtValue} />
      {rhythm === "stage" && (
        <input type="hidden" name="stageId" value={stageDateValue.stageId ?? ""} />
      )}
    </>
  );
}
