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
    newParams.delete("page"); // reset pagination
    setSearchParams(newParams);
  };

  return (
    <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
      {filters.map((filter) => (
        <div key={filter.key} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <label htmlFor={`filter-${filter.key}`} style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            {filter.label}
          </label>
          <select
            id={`filter-${filter.key}`}
            value={searchParams.get(filter.key) ?? ""}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            style={{
              fontSize: "13px",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
            }}
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
