import { useSearchParams } from "react-router";

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
    if (value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  return (
    <div className="flex gap-3 flex-wrap items-center">
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <label htmlFor={`filter-${filter.key}`} className="text-meta text-text-secondary">
            {filter.label}
          </label>
          <select
            id={`filter-${filter.key}`}
            value={searchParams.get(filter.key) ?? ""}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="text-meta px-2 py-1 rounded-sm border border-border bg-surface text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            <option value="">전체</option>
            {filter.values.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
