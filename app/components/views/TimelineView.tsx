import { cn } from "~/lib/utils/cn";
import {
  groupRecordsByStage,
  type StageGroup,
  type StageListItem,
  type RecordListItem,
} from "~/lib/utils/stage-groups";
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
}

const stageAccentColors: Record<string, string> = {
  prelude: "#EAF4FA",
  bridge: "#6CC4D6",
  challenge: "#0B2447",
  epilogue: "#E3E8EF",
  unassigned: "#E3E8EF",
};

const stageBorderColors: Record<string, string> = {
  prelude: "#EAF4FA",
  bridge: "#6CC4D6",
  challenge: "#0B2447",
  epilogue: "#8C8C91",
  unassigned: "#E3E8EF",
};

function formatDateMarker(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp * 1000));
}

function getDayKey(timestamp: number): number {
  return Math.floor(timestamp / 86400);
}

function StageSection({ group }: { group: StageGroup<TimelineRecord> }) {
  const { stageName, stageType, allRecords } = group;
  const accentColor = stageAccentColors[stageType] ?? stageAccentColors.unassigned;
  const borderColor = stageBorderColors[stageType] ?? stageBorderColors.unassigned;
  const isUnassigned = stageType === "unassigned";

  return (
    <section className="mb-12 last:mb-0">
      <div
        className={cn(
          "flex items-center gap-3 mb-6",
          isUnassigned && "opacity-70"
        )}
      >
        <span
          className="w-1 h-6 rounded-full flex-shrink-0"
          style={{ backgroundColor: borderColor }}
          aria-hidden="true"
        />
        <h3
          className={cn(
            "text-base font-semibold tracking-tight",
            isUnassigned ? "text-text-tertiary" : "text-text-primary"
          )}
        >
          {stageName}
        </h3>
        <span className="text-sm text-text-tertiary font-medium">
          ({allRecords.length})
        </span>
      </div>

      <div className="relative">
        <div
          className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent"
          aria-hidden="true"
        />

        <div className="space-y-4">
          {allRecords.map((record, index) => {
            const prevRecord = index > 0 ? allRecords[index - 1] : null;
            const showDateMarker =
              prevRecord === null || getDayKey(record.createdAt) !== getDayKey(prevRecord.createdAt);

            return (
              <div key={record.id}>
                {showDateMarker && (
                  <div className="flex items-center gap-3 pl-14 mb-3">
                    <time
                      className="text-xs font-medium text-text-tertiary uppercase tracking-wide"
                      suppressHydrationWarning
                    >
                      {formatDateMarker(record.createdAt)}
                    </time>
                    <div className="flex-1 h-px bg-border-subtle" aria-hidden="true" />
                  </div>
                )}

                <div className="relative pl-14">
                  <span
                    className="absolute left-[17px] top-5 w-3 h-3 rounded-full ring-2 ring-surface z-10"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                  <CompactTimelineCard
                    slug={record.slug}
                    title={record.title}
                    contentSnippet={record.contentSnippet}
                    format={record.format}
                    stageType={record.stageType}
                    createdAt={record.createdAt}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function TimelineView({ records, stages }: TimelineViewProps) {
  const stageGroups = groupRecordsByStage(records, stages);

  if (stageGroups.length === 0) {
    return (
      <EmptyState
        variant="records"
        message="조건에 맞는 기록이 없습니다."
      />
    );
  }

  return (
    <div className="relative">
      {stageGroups.map((group) => (
        <StageSection key={group.stageId ?? "unassigned"} group={group} />
      ))}
    </div>
  );
}
