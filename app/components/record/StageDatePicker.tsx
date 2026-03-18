import * as React from "react";
import { format, fromUnixTime, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import { DayPicker } from "react-day-picker";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils/utils";

export interface StageForPicker {
  id: string;
  name: string;
  slug: string;
  type: string;
  startDate: number | null;
  endDate: number | null;
  isCurrent: boolean;
}

export type StageDateMode = "range" | "stage";

interface StageDatePickerProps {
  mode: StageDateMode;
  onModeChange: (mode: StageDateMode) => void;
  stages: StageForPicker[];
  initialRange?: { from: Date; to: Date };
  initialStageId?: string;
  onRangeChange?: (range: { from: Date; to: Date } | undefined) => void;
  onStageChange?: (stageId: string | undefined) => void;
  onDatesChange?: (dates: {
    recordedAt: string | undefined;
    recordedEndAt: string | undefined;
  }) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
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

function MapPinIcon() {
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
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function StageDatePicker({
  mode,
  onModeChange,
  stages,
  initialRange,
  initialStageId,
  onRangeChange,
  onStageChange,
  onDatesChange,
  className,
  label = "기간 설정",
  disabled = false,
}: StageDatePickerProps) {
  const [dateRange, setDateRange] = React.useState<
    { from: Date; to: Date } | undefined
  >(initialRange);

  const [selectedStageId, setSelectedStageId] = React.useState<
    string | undefined
  >(initialStageId);

  const prevModeRef = React.useRef(mode);

  React.useEffect(() => {
    if (prevModeRef.current === mode) {
      return;
    }

    prevModeRef.current = mode;

    if (mode === "range") {
      setSelectedStageId(undefined);
      onStageChange?.(undefined);
    } else {
      setDateRange(undefined);
      onRangeChange?.(undefined);
    }

    onDatesChange?.({
      recordedAt: undefined,
      recordedEndAt: undefined,
    });
  }, [mode, onStageChange, onRangeChange, onDatesChange]);

  const selectedStage = React.useMemo(() => {
    if (!selectedStageId) return undefined;
    return stages.find((s) => s.id === selectedStageId);
  }, [selectedStageId, stages]);

  const handleRangeSelect = React.useCallback(
    (range: { from: Date; to: Date } | undefined) => {
      setDateRange(range);
      onRangeChange?.(range);

      if (range) {
        onDatesChange?.({
          recordedAt: format(range.from, "yyyy-MM-dd"),
          recordedEndAt: format(range.to, "yyyy-MM-dd"),
        });
      } else {
        onDatesChange?.({
          recordedAt: undefined,
          recordedEndAt: undefined,
        });
      }
    },
    [onRangeChange, onDatesChange],
  );

  const handleStageSelect = React.useCallback(
    (stageId: string | undefined) => {
      setSelectedStageId(stageId);
      onStageChange?.(stageId);

      const stage = stageId ? stages.find((s) => s.id === stageId) : undefined;

      if (stage && stage.startDate && stage.endDate) {
        const recordedAt = format(fromUnixTime(stage.startDate), "yyyy-MM-dd");
        const recordedEndAt = format(fromUnixTime(stage.endDate), "yyyy-MM-dd");
        onDatesChange?.({ recordedAt, recordedEndAt });
      } else {
        onDatesChange?.({
          recordedAt: undefined,
          recordedEndAt: undefined,
        });
      }
    },
    [stages, onStageChange, onDatesChange],
  );

  const displayText = React.useMemo(() => {
    if (mode === "range") {
      if (!dateRange) return "날짜 범위를 선택하세요";
      return `${format(dateRange.from, "yyyy년 M월 d일", { locale: ko })} — ${format(dateRange.to, "M월 d일", { locale: ko })}`;
    }

    if (!selectedStage) return "여정을 선택하세요";
    return selectedStage.name;
  }, [mode, dateRange, selectedStage]);

  const rangeModifiers = React.useMemo(() => {
    if (!dateRange) return {};

    const isRangeMiddle = (date: Date): boolean => {
      return (
        isWithinInterval(date, {
          start: dateRange.from,
          end: dateRange.to,
        }) &&
        date.getTime() !== dateRange.from.getTime() &&
        date.getTime() !== dateRange.to.getTime()
      );
    };

    return {
      rangeStart: dateRange.from,
      rangeEnd: dateRange.to,
      rangeMiddle: isRangeMiddle,
    };
  }, [dateRange]);

  const rangeModifiersClassNames = {
    rangeStart:
      "bg-ocean-blue text-white rounded-l-md hover:bg-ocean-blue hover:text-white",
    rangeEnd:
      "bg-ocean-blue text-white rounded-r-md hover:bg-ocean-blue hover:text-white",
    rangeMiddle: "bg-mist-blue hover:bg-mist-blue",
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="block text-meta font-medium text-text-secondary">
        {label}
      </Label>

      <div
        className="inline-flex rounded-lg border border-border bg-surface-secondary p-1"
        role="radiogroup"
          aria-label="구간 날짜 선택 방식"
      >
        <button
          type="button"
          aria-pressed={mode === "range"}
          onClick={() => onModeChange("range")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            mode === "range"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          <CalendarIcon />
          기간 선택
        </button>
        <button
          type="button"
          aria-pressed={mode === "stage"}
          onClick={() => onModeChange("stage")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            mode === "stage"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          <MapPinIcon />
          Stage 선택
        </button>
      </div>

      {mode === "range" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-[320px] justify-start text-left font-normal",
                !dateRange && "text-text-tertiary",
              )}
            >
              <CalendarIcon />
              {displayText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DayPicker
              mode="range"
              locale={ko}
              weekStartsOn={1}
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  handleRangeSelect({ from: range.from, to: range.to });
                } else if (range?.from) {
                  handleRangeSelect({ from: range.from, to: range.from });
                } else {
                  handleRangeSelect(undefined);
                }
              }}
              numberOfMonths={2}
              showOutsideDays
              className="p-3"
              classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4",
                month_caption: "flex justify-center pt-1 relative items-center h-7",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1 absolute inset-x-0 justify-between",
                button_previous: cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                  "hover:bg-surface-secondary hover:text-text-primary",
                  "h-7 w-7 bg-transparent p-0 text-text-secondary opacity-70 hover:opacity-100",
                ),
                button_next: cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                  "hover:bg-surface-secondary hover:text-text-primary",
                  "h-7 w-7 bg-transparent p-0 text-text-secondary opacity-70 hover:opacity-100",
                ),
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday: "text-text-tertiary rounded-md w-9 font-normal text-[0.8rem]",
                week: "flex w-full mt-2",
                day: cn(
                  "relative p-0 text-center text-sm",
                  "focus-within:relative focus-within:z-20",
                ),
                day_button: cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                  "hover:bg-surface-secondary hover:text-text-primary",
                  "h-9 w-9 p-0 font-normal",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
                  "aria-selected:opacity-100",
                ),
                today: "bg-surface-secondary text-text-primary font-semibold",
                outside:
                  "text-text-tertiary opacity-50 aria-selected:bg-mist-blue/20 aria-selected:text-text-tertiary",
                disabled: "text-text-tertiary opacity-50",
                hidden: "invisible",
              }}
              modifiers={rangeModifiers}
              modifiersClassNames={rangeModifiersClassNames}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {mode === "stage" && (
        <div className="space-y-2">
          {stages.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                선택할 수 있는 Stage가 없습니다
              </p>
            ) : (
              <div
                className="grid gap-2"
                role="radiogroup"
                aria-label="Stage 선택"
              >
              {stages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                const startDate = stage.startDate;
                const endDate = stage.endDate;
                let dateRangeText = "날짜 미지정";

                if (startDate != null && endDate != null) {
                  const stageStartDate = fromUnixTime(startDate);
                  const stageEndDate = fromUnixTime(endDate);
                  dateRangeText = `${format(stageStartDate, "M월 d일", { locale: ko })} — ${format(stageEndDate, "M월 d일", { locale: ko })}`;
                }

                return (
                  <button
                    key={stage.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onClick={() =>
                      handleStageSelect(isSelected ? undefined : stage.id)
                    }
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected
                        ? "border-ocean-blue bg-mist-blue/40"
                        : "border-border bg-surface hover:border-border/80 hover:bg-surface-secondary",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-ocean-blue bg-ocean-blue"
                          : "border-border",
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <div className="h-full w-full scale-50 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium",
                            isSelected ? "text-text-primary" : "text-text-primary",
                          )}
                        >
                          {stage.name}
                        </span>
                        {stage.isCurrent && (
                          <span className="inline-flex items-center rounded-full bg-ocean-blue/10 px-2 py-0.5 text-xs font-medium text-ocean-blue">
                            현재 Stage
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-text-tertiary">
                        {dateRangeText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedStage && (
              <p className="text-sm text-text-secondary">
                선택한 Stage의 기간이 자동으로 적용됩니다
              </p>
          )}
        </div>
      )}
    </div>
  );
}
