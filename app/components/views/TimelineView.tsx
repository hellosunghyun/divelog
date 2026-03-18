import { cn } from "~/lib/utils/cn";
import type { StageListItem, RecordListItem } from "~/lib/utils/stage-groups";
import CompactTimelineCard from "~/components/cards/CompactTimelineCard";
import EmptyState from "~/components/feedback/EmptyState";

type TimelineRecord = RecordListItem & {
  id: string;
  slug: string;
  title: string;
  contentSnippet?: string | null;
  stageType?: "prelude" | "bridge" | "challenge" | "epilogue" | null;
};

interface TimelineViewProps {
  records: TimelineRecord[];
  stages: StageListItem[];
  isRead?: (recordId: string) => boolean;
}

type TimelineItem =
  | { kind: "stage"; stageId: string | null; stageName: string; stageType: string }
  | { kind: "record"; record: TimelineRecord };

function buildItems(records: TimelineRecord[], stages: StageListItem[]): TimelineItem[] {
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const items: TimelineItem[] = [];
  const seenStages = new Set<string>();

  for (const record of records) {
    const key = record.stageId ?? "__unassigned__";
    if (!seenStages.has(key)) {
      seenStages.add(key);
      const stage = record.stageId ? stageMap.get(record.stageId) : null;
      items.push({
        kind: "stage",
        stageId: record.stageId,
        stageName: stage?.name ?? "미분류",
        stageType: stage?.type ?? "unassigned",
      });
    }
    items.push({ kind: "record", record });
  }

  return items;
}

const STAGE_DOT: Record<string, string> = {
  prelude: "bg-[#2F6C84]",
  bridge: "bg-reef-cyan",
  challenge: "bg-deep-ocean",
  epilogue: "bg-text-tertiary",
  unassigned: "bg-border",
};

const STAGE_TEXT: Record<string, string> = {
  prelude: "text-[#2F6C84]",
  bridge: "text-[#0C6E82]",
  challenge: "text-deep-ocean",
  epilogue: "text-text-tertiary",
  unassigned: "text-text-tertiary",
};

export default function TimelineView({ records, stages, isRead }: TimelineViewProps) {
  if (records.length === 0) {
    return <EmptyState variant="records" message="조건에 맞는 기록이 없습니다." />;
  }

  const items = buildItems(records, stages);

  const formats = new Set(records.map((r) => r.format));
  const singleFormat = formats.size === 1;

  return (
    <div className="relative mx-auto max-w-4xl isolate">
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border hidden md:block -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute left-5 top-0 bottom-0 w-px bg-border md:hidden -z-10"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-5 md:gap-6">
        {items.map((item, idx) => {
          if (item.kind === "stage") {
            const dot = STAGE_DOT[item.stageType] ?? STAGE_DOT.unassigned;
            const txt = STAGE_TEXT[item.stageType] ?? STAGE_TEXT.unassigned;

            return (
              <div key={`s-${item.stageId ?? "none"}-${item.stageName}`} className="relative z-10">
                <div className="hidden md:grid md:grid-cols-[1fr_48px_1fr] items-center py-2">
                  <div className="h-px bg-border" />
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn("w-4 h-4 rounded-full ring-4 ring-bg", dot)}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="h-px bg-border" />
                </div>
                <div className="hidden md:flex justify-center -mt-1">
                  <span className={cn("text-xs font-semibold", txt)}>
                    {item.stageName}
                  </span>
                </div>

                <div className="md:hidden flex items-center gap-3">
                  <span
                    className={cn(
                      "relative z-10 w-3 h-3 rounded-full ring-4 ring-bg shrink-0 ml-[14px]",
                      dot,
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("text-xs font-semibold", txt)}>
                    {item.stageName}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            );
          }

          const { record } = item;
          const isNote = record.format === "note";

          return (
            <div key={record.id} className="relative z-10">
              {singleFormat ? (
                <div className="hidden md:flex md:flex-col md:items-center">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full ring-2 ring-surface",
                      isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                    )}
                    aria-hidden="true"
                  />
                  <div className="w-full max-w-md mt-3">
                    <CompactTimelineCard
                      slug={record.slug}
                      title={record.title}
                      contentSnippet={record.contentSnippet}
                      format={record.format}
                      stageType={record.stageType}
                      createdAt={record.createdAt}
                      isRead={isRead?.(record.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="hidden md:grid md:grid-cols-[1fr_48px_1fr] items-start">
                  <div className={cn("flex", isNote ? "justify-end pr-6" : "")}>
                    {isNote && (
                      <div className="w-full max-w-sm">
                        <CompactTimelineCard
                          slug={record.slug}
                          title={record.title}
                          contentSnippet={record.contentSnippet}
                          format={record.format}
                          stageType={record.stageType}
                          createdAt={record.createdAt}
                          isRead={isRead?.(record.id)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center pt-5">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-surface",
                        isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  <div className={cn("flex", !isNote ? "justify-start pl-6" : "")}>
                    {!isNote && (
                      <div className="w-full max-w-sm">
                        <CompactTimelineCard
                          slug={record.slug}
                          title={record.title}
                          contentSnippet={record.contentSnippet}
                          format={record.format}
                          stageType={record.stageType}
                          createdAt={record.createdAt}
                          isRead={isRead?.(record.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:hidden relative pl-14">
                <span
                  className={cn(
                    "absolute left-[17px] top-5 w-3 h-3 rounded-full ring-2 ring-surface z-10",
                    isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                  )}
                  aria-hidden="true"
                />
                <CompactTimelineCard
                  slug={record.slug}
                  title={record.title}
                  contentSnippet={record.contentSnippet}
                  format={record.format}
                  stageType={record.stageType}
                  createdAt={record.createdAt}
                  isRead={isRead?.(record.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
