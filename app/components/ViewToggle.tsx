import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { Button } from "~/components/ui/button";

export type RecordView = "grid" | "timeline";

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

const OPTIONS: ToggleOption[] = [
  { value: "grid", label: "그리드 보기", icon: GridIcon },
  { value: "timeline", label: "타임라인 보기", icon: TimelineIcon },
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
    <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-xs">
      {OPTIONS.map((option) => {
        const isActive = option.value === currentView;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleViewChange(option.value)}
            aria-pressed={isActive}
            className={`h-11 min-w-11 rounded-lg px-3 transition-colors duration-normal focus-visible:ring-ocean-blue ${
              isActive
                ? "bg-mist-blue text-ocean-blue"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            }`}
            title={option.label}
          >
            <span className="sr-only">{option.label}</span>
            {option.icon}
          </Button>
        );
      })}
    </div>
  );
}
