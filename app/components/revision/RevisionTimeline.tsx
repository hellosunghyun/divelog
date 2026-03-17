import { RevisionDiffView } from "./RevisionDiffView";

interface RevisionItem {
  revision: {
    id: string;
    revisionNumber: number;
    snapshot: string;
    changedFields: string;
    tagsSnapshot: string | null;
    createdAt: number;
  };
  author: { displayName: string | null; slug: string | null } | null;
}

interface RevisionTimelineProps {
  revisions: RevisionItem[];
  currentRecord: Record<string, unknown>;
  currentTags: Array<{ id: string; name: string }>;
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
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export function RevisionTimeline({
  revisions,
  currentRecord,
  currentTags,
}: RevisionTimelineProps) {
  if (!revisions || revisions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="revision-timeline"
      className="relative rounded-2xl border p-6 lg:p-7"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div
        className="absolute left-9 top-12 bottom-8 w-px"
        style={{ backgroundColor: "var(--color-border)" }}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-6">
        {revisions.map((item, index) => {
          const afterState =
            index === 0
              ? currentRecord
              : JSON.parse(revisions[index - 1].revision.snapshot);

          const afterTags =
            index === 0
              ? currentTags
              : JSON.parse(
                  revisions[index - 1].revision.tagsSnapshot ?? "null",
                ) ?? [];

          const beforeSnapshot =
            index === revisions.length - 1
              ? {}
              : JSON.parse(revisions[index + 1].revision.snapshot);

          const beforeTags =
            index === revisions.length - 1
              ? []
              : JSON.parse(
                  revisions[index + 1].revision.tagsSnapshot ?? "null",
                ) ?? [];

          const changedFields: string[] = JSON.parse(
            item.revision.changedFields,
          );

          return (
            <div
              key={item.revision.id}
              data-testid="revision-item"
              className="relative flex gap-3"
            >
              <div
                className="mt-1 z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--color-ocean-blue)" }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-surface)" }}
                >
                  {item.revision.revisionNumber}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--color-text-tertiary)" }}
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(item.revision.createdAt)}
                  </p>
                  {item.author?.displayName && (
                    <>
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        ·
                      </span>
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {item.author.displayName}
                      </span>
                    </>
                  )}
                </div>

                <RevisionDiffView
                  changedFields={changedFields}
                  beforeSnapshot={beforeSnapshot}
                  afterState={afterState}
                  beforeTags={beforeTags}
                  afterTags={afterTags}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
