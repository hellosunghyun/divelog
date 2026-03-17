import { useSearchParams } from "react-router";

import { cn } from "~/lib/cn";

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

  return (
    <div className="flex flex-col gap-4">
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
