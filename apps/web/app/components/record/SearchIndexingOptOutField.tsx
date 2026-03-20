import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils/utils";

type SearchIndexingOptOutFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
};

export function SearchIndexingOptOutField({
  checked,
  onChange,
  id = "searchIndexingOptOut",
  className,
}: SearchIndexingOptOutFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4">
        <Checkbox
          id={id}
          name="searchIndexingOptOut"
          checked={checked}
          onCheckedChange={(nextChecked) => onChange(nextChecked === true)}
          className={cn(
            "mt-0.5 border-border bg-surface",
            "data-[state=checked]:border-ocean-blue data-[state=checked]:bg-ocean-blue",
          )}
        />

        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-text-primary">
            검색 엔진에서 이 기록 제외
          </Label>
          <p className="text-xs leading-5 text-text-tertiary">
            개인 블로그나 노션에도 같은 글을 올렸다면 체크하세요. DiveLog에서는 그대로 볼 수 있지만, 검색 엔진에는 이 페이지를 노출하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
