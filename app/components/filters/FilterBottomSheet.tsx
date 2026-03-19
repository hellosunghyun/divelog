import { useNavigate, useSearchParams } from "react-router";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const RHYTHM_OPTIONS = [
  { value: "moment", label: "순간" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "stage", label: "구간" },
  { value: "free", label: "자유" },
];

const TYPE_OPTIONS = [
  { value: "personal", label: "개인" },
  // [COLLAB_DISABLED] { value: "collaboration", label: "협업" },
];

export function FilterBottomSheet({ isOpen, onClose }: FilterBottomSheetProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentRhythm = searchParams.get("rhythm") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentHasQuestion = searchParams.get("hasQuestion") ?? "";
  const currentHasSelfAnswer = searchParams.get("hasSelfAnswer") ?? "";

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete("page");
    navigate(`/logs?${newParams.toString()}`);
  };

  const handleApply = () => {
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        data-testid="filter-bottom-sheet"
        className={`fixed inset-x-0 bottom-0 z-50 bg-[--color-surface] rounded-t-2xl shadow-xl transition-transform duration-300 max-h-[85vh] overflow-y-auto ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="필터"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 bg-[--color-border] rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-[--color-border]">
          <h2 className="text-lg font-semibold text-[--color-text-primary]">필터</h2>
        </div>

        <div className="px-5 py-4 space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div>
            <span className="block text-sm font-medium text-[--color-text-secondary] mb-2">
              유형
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilter("type", "")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentType === ""
                    ? "bg-[--color-deep-ocean] text-white"
                    : "bg-[--color-surface-secondary] text-[--color-text-secondary] hover:bg-[--color-border]"
                }`}
              >
                전체
              </button>
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFilter("type", option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentType === option.value
                      ? "bg-[--color-deep-ocean] text-white"
                      : "bg-[--color-surface-secondary] text-[--color-text-secondary] hover:bg-[--color-border]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-[--color-text-secondary] mb-2">
              리듬
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilter("rhythm", "")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentRhythm === ""
                    ? "bg-[--color-deep-ocean] text-white"
                    : "bg-[--color-surface-secondary] text-[--color-text-secondary] hover:bg-[--color-border]"
                }`}
              >
                전체
              </button>
              {RHYTHM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFilter("rhythm", option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentRhythm === option.value
                      ? "bg-[--color-deep-ocean] text-white"
                      : "bg-[--color-surface-secondary] text-[--color-text-secondary] hover:bg-[--color-border]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="filter-has-question-mobile"
              checked={currentHasQuestion === "true"}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                updateFilter("hasQuestion", checked === true ? "true" : "")
              }
              className="h-5 w-5 border-[--color-border] data-[state=checked]:bg-[--color-ocean-blue] data-[state=checked]:border-[--color-ocean-blue]"
            />
            <Label htmlFor="filter-has-question-mobile" className="text-base text-[--color-text-primary] cursor-pointer">
              질문이 있는 기록만
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="filter-has-self-answer-mobile"
              checked={currentHasSelfAnswer === "true"}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                updateFilter("hasSelfAnswer", checked === true ? "true" : "")
              }
              className="h-5 w-5 border-[--color-border] data-[state=checked]:bg-[--color-ocean-blue] data-[state=checked]:border-[--color-ocean-blue]"
            />
            <Label htmlFor="filter-has-self-answer-mobile" className="text-base text-[--color-text-primary] cursor-pointer">
              자기답변이 있는 기록만
            </Label>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3.5 bg-[--color-ocean-blue] text-white font-semibold rounded-xl hover:bg-[--color-deep-ocean] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ocean-blue] focus-visible:ring-offset-2"
          >
            적용
          </button>
        </div>
      </div>
    </>
  );
}
