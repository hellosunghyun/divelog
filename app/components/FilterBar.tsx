import { useSearchParams } from "react-router";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
          <Label htmlFor={`filter-${filter.key}`} className="text-sm text-text-secondary whitespace-nowrap">
            {filter.label}
          </Label>
          <Select
            value={searchParams.get(filter.key) ?? ALL_FILTER_VALUE}
            onValueChange={(value) =>
              handleChange(filter.key, value === ALL_FILTER_VALUE ? "" : value)
            }
          >
            <SelectTrigger
              id={`filter-${filter.key}`}
              className="h-9 min-w-32 rounded-lg border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-none focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
              {filter.values.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
