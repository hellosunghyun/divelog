import { useSearchParams } from "react-router";

interface SortOption {
  value: string;
  label: string;
}

// NO 인기순/추천순/popular
const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: "recent", label: "최근 기록" },
  { value: "oldest", label: "오래된 기록" },
];

interface SortBarProps {
  options?: SortOption[];
}

export default function SortBar({ options = DEFAULT_SORT_OPTIONS }: SortBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="flex gap-2 items-center">
      <label htmlFor="sort-select" className="text-sm text-text-secondary">정렬</label>
      <select
        id="sort-select"
        value={searchParams.get("sort") ?? "recent"}
        onChange={(e) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("sort", e.target.value);
          setSearchParams(newParams);
        }}
        className="text-sm px-3 py-2.5 rounded-lg border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
