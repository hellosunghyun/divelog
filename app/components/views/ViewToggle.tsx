import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { cn } from "~/lib/utils/cn";

export type RecordView = "grid" | "timeline" | "calendar";

interface ViewToggleProps {
  currentView: RecordView;
}

interface ToggleOption {
  value: RecordView;
  label: string;
  icon: ReactNode;
}

const GridIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
);

const TimelineIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="4" x2="8" y2="20" />
    <circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <line x1="12" y1="7" x2="19" y2="7" />
    <line x1="12" y1="12" x2="19" y2="12" />
    <line x1="12" y1="17" x2="19" y2="17" />
  </svg>
);

const CalendarIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 1v6M16 1v6" />
    <rect x="6" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
    <rect x="10.75" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
    <rect x="15.5" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
  </svg>
);

const OPTIONS: ToggleOption[] = [
  { value: "grid", label: "그리드 보기", icon: GridIcon },
  { value: "timeline", label: "타임라인 보기", icon: TimelineIcon },
  { value: "calendar", label: "캘린더 보기", icon: CalendarIcon },
];

export default function ViewToggle({ currentView }: ViewToggleProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleViewChange = (nextView: RecordView) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("view", nextView);
    nextParams.delete("page");
    setSearchParams(nextParams);
  };

  return (
    <div className="inline-flex rounded-full bg-surface-secondary p-1 gap-0.5">
      {OPTIONS.map((option) => {
        const isActive = option.value === currentView;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleViewChange(option.value)}
            aria-label={option.label}
            aria-pressed={isActive}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-premium",
              "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
              "active:scale-[0.98]",
              isActive
                ? "bg-surface shadow-tinted-sm text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <span className="sr-only">{option.label}</span>
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
