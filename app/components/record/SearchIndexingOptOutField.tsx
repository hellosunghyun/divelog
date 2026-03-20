import { Label } from "~/components/ui/label";

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
        <div className="relative mt-0.5 flex items-center justify-center">
          <input
            type="checkbox"
            id={id}
            name="searchIndexingOptOut"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-5 rounded-md border border-border bg-surface transition-colors peer-checked:border-ocean-blue peer-checked:bg-ocean-blue peer-focus-visible:ring-2 peer-focus-visible:ring-ocean-blue peer-focus-visible:ring-offset-2" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

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
