import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils/utils";

interface RevisionItem {
  revision: {
    id: string;
    revisionNumber: number;
    changedFields: string;
    createdAt: number;
  };
  author: { displayName: string | null; slug: string | null } | null;
}

interface EditedIndicatorProps {
  createdAt: number;
  updatedAt: number;
  className?: string;
  revisions?: RevisionItem[];
}

const EDIT_THRESHOLD_SECONDS = 60;

const FIELD_LABELS: Record<string, string> = {
  title: "제목",
  content: "내용",
  contentText: "내용",
  format: "형식",
  type: "유형",
  rhythm: "리듬",
  visibility: "공개 범위",
  responsePreference: "응답 선호",
  stageId: "구간",
  challengeId: "챌린지",
  tags: "태그",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return formatDate(timestamp);
}

function parseChangedFields(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function EditedIndicator({
  createdAt,
  updatedAt,
  className,
  revisions,
}: EditedIndicatorProps) {
  if (updatedAt <= createdAt + EDIT_THRESHOLD_SECONDS) {
    return null;
  }

  const label = `수정됨 · ${formatRelativeTime(updatedAt)}`;
  const fullDate = new Date(updatedAt * 1000).toLocaleString("ko-KR");

  if (!revisions || revisions.length === 0) {
    return (
      <span
        className={cn(
          "text-text-tertiary text-xs font-medium leading-relaxed",
          className,
        )}
        title={fullDate}
      >
        {label}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-text-tertiary text-xs font-medium leading-relaxed hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-0 p-0",
            className,
          )}
          title={fullDate}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-72 max-h-80 overflow-y-auto p-0"
      >
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-text-primary">
            수정 이력 ({revisions.length}건)
          </p>
        </div>
        <ul className="divide-y divide-border">
          {revisions.map((item) => {
            const fields = parseChangedFields(item.revision.changedFields);
            const fieldLabels = fields
              .map((f) => FIELD_LABELS[f] ?? f)
              .filter((v, i, a) => a.indexOf(v) === i);

            return (
              <li key={item.revision.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary" suppressHydrationWarning>
                    {formatDate(item.revision.createdAt)}
                  </span>
                  {item.author?.displayName && (
                    <span className="text-xs text-text-tertiary">
                      {item.author.displayName}
                    </span>
                  )}
                </div>
                {fieldLabels.length > 0 && (
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    {fieldLabels.join(", ")} 변경
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
