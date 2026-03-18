import { useState } from "react";
import { useSearchParams } from "react-router";

import { cn } from "~/lib/utils/cn";

const ALL_FILTER_VALUE = "__all__";

interface FilterOption {
  key: string;
  label: string;
  values: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
}

export default function FilterBar({ filters }: FilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = filters.filter(
    (filter) => {
      const value = searchParams.get(filter.key);
      return value !== null && value !== "" && value !== ALL_FILTER_VALUE;
    }
  ).length;

  const handleChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "" || value === ALL_FILTER_VALUE) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  const handleReset = () => {
    const newParams = new URLSearchParams(searchParams);
    filters.forEach((filter) => {
      newParams.delete(filter.key);
    });
    newParams.delete("page");
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-secondary transition-colors text-sm font-medium text-text-secondary"
          aria-expanded={isExpanded}
          aria-controls="filter-panel"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>필터</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocean-blue text-white text-xs font-semibold">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {isExpanded && (
        <div
          id="filter-panel"
          className="mt-3 pt-4 border-t border-border flex flex-col gap-4"
        >
          {filters.map((filter) => {
            const currentValue = searchParams.get(filter.key) ?? ALL_FILTER_VALUE;

            return (
              <div key={filter.key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-secondary">
                  {filter.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    label="전체"
                    isActive={currentValue === ALL_FILTER_VALUE}
                    onClick={() => handleChange(filter.key, "")}
                  />
                  {filter.values.map((v) => (
                    <FilterChip
                      key={v.value}
                      label={v.label}
                      isActive={currentValue === v.value}
                      onClick={() => handleChange(filter.key, v.value)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-premium",
        "hover:bg-surface-secondary active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
        isActive
          ? "bg-mist-blue text-ocean-blue border-ocean-blue/30"
          : "bg-surface text-text-secondary border-border"
      )}
    >
      {label}
    </button>
  );
}
