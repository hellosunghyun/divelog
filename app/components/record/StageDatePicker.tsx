import * as React from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { cn } from "~/lib/utils/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface Stage {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate?: number | null;
  endDate?: number | null;
}

interface StageDatePickerValue {
  recordedAt?: string;
  recordedEndAt?: string;
  stageId?: string;
}

interface StageDatePickerProps {
  stages: Stage[];
  value?: StageDatePickerValue;
  onSelect: (value: StageDatePickerValue) => void;
}

type StageDateMode = "range" | "stage";

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

export function StageDatePicker({
  stages,
  value,
  onSelect,
}: StageDatePickerProps) {
  const [mode, setMode] = React.useState<StageDateMode>("range");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (mode === "range" && value?.recordedAt) {
      const from = new Date(value.recordedAt);
      const to = value.recordedEndAt ? new Date(value.recordedEndAt) : from;
      setDateRange({ from, to });
    } else {
      setDateRange(undefined);
    }
  }, [mode, value?.recordedAt, value?.recordedEndAt]);

  const handleModeChange = (newMode: StageDateMode) => {
    setMode(newMode);
    setDateRange(undefined);
    onSelect({});
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);

    if (!range?.from) {
      onSelect({});
      return;
    }

    const recordedAt = format(range.from, "yyyy-MM-dd");
    const recordedEndAt = range.to
      ? format(range.to, "yyyy-MM-dd")
      : recordedAt;

    onSelect({
      recordedAt,
      recordedEndAt: range.to ? recordedEndAt : undefined,
    });
  };

  const handleStageSelect = (stageId: string) => {
    const selectedStage = stages.find((s) => s.id === stageId);

    if (!selectedStage) {
      onSelect({});
      return;
    }

    onSelect({
      stageId: selectedStage.id,
      recordedAt: selectedStage.startDate
        ? format(new Date(selectedStage.startDate * 1000), "yyyy-MM-dd")
        : undefined,
      recordedEndAt: selectedStage.endDate
        ? format(new Date(selectedStage.endDate * 1000), "yyyy-MM-dd")
        : undefined,
    });
  };

  const rangeDisplayText = dateRange?.from ? (
    dateRange.to ? (
      <>
        {format(dateRange.from, "yyyy년 M월 d일", { locale: ko })}
        {" — "}
        {format(dateRange.to, "M월 d일", { locale: ko })}
      </>
    ) : (
      format(dateRange.from, "yyyy년 M월 d일", { locale: ko })
    )
  ) : (
    "기간을 선택하세요"
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["range", "stage"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all duration-[var(--duration-fast)]",
              "hover:bg-surface-secondary active:scale-[0.98]",
              "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
              mode === m
                ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
                : "bg-surface text-text-secondary border-border",
            )}
          >
            {m === "range" ? "기간 선택" : "여정 선택"}
          </button>
        ))}
      </div>

      {mode === "range" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange?.from && "text-text-tertiary",
              )}
            >
              <CalendarIcon />
              {rangeDisplayText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {mode === "stage" && (
        <Select value={value?.stageId || ""} onValueChange={handleStageSelect}>
          <SelectTrigger className="w-auto min-w-40 bg-surface">
            <SelectValue placeholder="여정을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {stages.length === 0 ? (
              <SelectItem disabled value="__empty__">
                여정 없음
              </SelectItem>
            ) : (
              stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                  {stage.isCurrent ? " (현재)" : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
