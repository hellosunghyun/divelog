import { useSearchParams } from "react-router";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
      <Label htmlFor="sort-select" className="text-sm text-text-secondary whitespace-nowrap">정렬</Label>
      <Select
        value={searchParams.get("sort") ?? "recent"}
        onValueChange={(value) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("sort", value);
          setSearchParams(newParams);
        }}
      >
        <SelectTrigger
          id="sort-select"
          className="h-9 min-w-36 rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-none focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
