import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

interface DiscoveryHelperBlocksProps {
  currentStage: { id: string; name: string; slug: string } | null;
  recentActivity: { recordCount: number; questionCount: number; lastActiveAt: string | null } | null;
  starterRecords: Array<{ slug: string; title: string }>;
}

function CurrentStageBlock({ stage }: { stage: { id: string; name: string; slug: string } }) {
  return (
    <div data-testid="current-stage-block" className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-tertiary">현재 여정</span>
        <Link
          to={`/journey/${stage.slug}`}
          className="min-w-0 break-words rounded-full bg-mist-blue px-3 py-1.5 text-sm font-medium text-ocean-blue transition-colors no-underline hover:bg-reef-cyan/30"
        >
          {stage.name}
        </Link>
      </div>
    </div>
  );
}

function RecentActivityBlock({
  recordCount,
  questionCount,
}: {
  recordCount: number;
  questionCount: number;
}) {
  const parts: string[] = [];
  if (recordCount > 0) {
    parts.push(`기록 ${recordCount}개`);
  }
  if (questionCount > 0) {
    parts.push(`질문 ${questionCount}개`);
  }

  if (parts.length === 0) return null;

  return (
    <div data-testid="recent-activity-block" className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <span className="break-words text-sm text-text-secondary">{parts.join(" · ")}</span>
    </div>
  );
}

function StarterLinksBlock({ records }: { records: Array<{ slug: string; title: string }> }) {
  const displayRecords = records.slice(0, 2);

  if (displayRecords.length === 0) return null;

  return (
    <div data-testid="starter-links" className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-text-tertiary mb-3">여기서 시작해보세요</p>
      <div className="flex flex-col gap-2">
        {displayRecords.map((record) => (
          <Link
            key={record.slug}
            to={`/logs/${record.slug}`}
            className="min-w-0 break-words text-sm text-text-secondary transition-colors no-underline hover:text-ocean-blue"
          >
            {record.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryHelperBlocks({
  currentStage,
  recentActivity,
  starterRecords,
}: DiscoveryHelperBlocksProps) {
  const hasStage = currentStage !== null;
  const hasActivity = recentActivity !== null && (recentActivity.recordCount > 0 || recentActivity.questionCount > 0);
  const hasStarterRecords = starterRecords.length > 0;

  if (!hasStage && !hasActivity && !hasStarterRecords) {
    return null;
  }

  return (
    <div className={cn("min-w-0 flex flex-col gap-3")}>
      {hasStage && <CurrentStageBlock stage={currentStage} />}
      {hasActivity && (
        <RecentActivityBlock
          recordCount={recentActivity.recordCount}
          questionCount={recentActivity.questionCount}
        />
      )}
      {hasStarterRecords && <StarterLinksBlock records={starterRecords} />}
    </div>
  );
}
