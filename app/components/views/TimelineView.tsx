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

function StageSection({ group }: { group: StageGroup<TimelineRecord> }) {
  const { stageName, stageType, notes, articles } = group;
  const accentColor = stageAccentColors[stageType] ?? stageAccentColors.unassigned;
  const borderColor = stageBorderColors[stageType] ?? stageBorderColors.unassigned;
  const isUnassigned = stageType === "unassigned";

  return (
    <section className="mb-10 last:mb-0">
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
      </div>

      <div className="relative">
        <div
          className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-ocean-blue/30 via-border to-transparent"
          aria-hidden="true"
        />

        <div className="hidden md:grid md:grid-cols-[1fr_1fr] gap-8">
          <div className="space-y-3 pr-4">
            {notes.length > 0 ? (
              notes.map((record) => (
                <CompactTimelineCard
                  key={record.id}
                  slug={record.slug}
                  title={record.title}
                  contentSnippet={record.contentSnippet}
                  format="note"
                  stageType={record.stageType}
                  createdAt={record.createdAt}
                />
              ))
            ) : (
              <div className="h-12 flex items-center justify-center">
                <span className="text-xs text-text-tertiary">노트 없음</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pl-4">
            {articles.length > 0 ? (
              articles.map((record) => (
                <CompactTimelineCard
                  key={record.id}
                  slug={record.slug}
                  title={record.title}
                  contentSnippet={record.contentSnippet}
                  format="article"
                  stageType={record.stageType}
                  createdAt={record.createdAt}
                />
              ))
            ) : (
              <div className="h-12 flex items-center justify-center">
                <span className="text-xs text-text-tertiary">글 없음</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden space-y-3">
          <div
            className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-ocean-blue/30 via-border to-transparent"
            aria-hidden="true"
          />

          {group.allRecords.map((record) => (
            <div key={record.id} className="relative pl-10">
              <span
                className="absolute left-1.5 top-4 w-2 h-2 rounded-full ring-2 ring-surface"
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
          ))}
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
