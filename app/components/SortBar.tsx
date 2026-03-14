import { useSearchParams } from "react-router";

interface SortOption {
  value: string;
  label: string;
}

// NOTE: NO 인기순/추천순/popular
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
    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>정렬</span>
      <select
        value={searchParams.get("sort") ?? "recent"}
        onChange={(e) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("sort", e.target.value);
          setSearchParams(newParams);
        }}
        style={{
          fontSize: "13px",
          padding: "4px 8px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
