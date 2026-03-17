import { useSearchParams } from "react-router";

import { cn } from "~/lib/cn";
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
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-text-secondary whitespace-nowrap">
        정렬
      </span>
      <Select
        value={searchParams.get("sort") ?? "recent"}
        onValueChange={(value) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("sort", value);
          setSearchParams(newParams);
        }}
      >
        <SelectTrigger
          aria-label="정렬 방식"
          className={cn(
            "h-9 min-w-36 rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-none",
            "transition-premium active:scale-[0.98]",
            "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2",
            "hover:border-ocean-blue/30"
          )}
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
