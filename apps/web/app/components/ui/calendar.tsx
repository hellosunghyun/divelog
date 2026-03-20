import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";

import { cn } from "~/lib/utils/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ko}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
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
          "[&:has([aria-selected])]:bg-mist-blue/40",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-range-start)]:rounded-l-md",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day_button: cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "hover:bg-surface-secondary hover:text-text-primary",
          "h-9 w-9 p-0 font-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-1",
          "aria-selected:opacity-100",
        ),
        range_start: "day-range-start rounded-l-md",
        range_end: "day-range-end rounded-r-md",
        selected: cn(
          "bg-ocean-blue text-white",
          "hover:bg-ocean-blue hover:text-white",
          "focus:bg-ocean-blue focus:text-white",
        ),
        today: "bg-surface-secondary text-text-primary font-semibold",
        outside: "text-text-tertiary opacity-50 aria-selected:bg-mist-blue/20 aria-selected:text-text-tertiary",
        disabled: "text-text-tertiary opacity-50",
        range_middle: "aria-selected:bg-mist-blue/40 aria-selected:text-text-primary",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
