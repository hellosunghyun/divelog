import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

interface DiscoveryHelperBlocksProps {
  currentStage: { id: string; name: string; slug: string } | null;
  recentActivity: { recordCount: number; questionCount: number; lastActiveAt: string | null } | null;
  starterRecords: Array<{ slug: string; title: string }>;
  learnerSlug: string;
}

function CurrentStageBlock({ stage }: { stage: { id: string; name: string; slug: string } }) {
  return (
    <div data-testid="current-stage-block" className="p-4 rounded-xl bg-surface border border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-tertiary">현재 여정</span>
        <Link
          to={`/journey/${stage.slug}`}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-mist-blue text-ocean-blue hover:bg-reef-cyan/30 transition-colors no-underline"
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
    <div data-testid="recent-activity-block" className="p-4 rounded-xl bg-surface border border-border">
      <span className="text-sm text-text-secondary">{parts.join(" · ")}</span>
    </div>
  );
}

function StarterLinksBlock({ records }: { records: Array<{ slug: string; title: string }> }) {
  const displayRecords = records.slice(0, 2);

  if (displayRecords.length === 0) return null;

  return (
    <div data-testid="starter-links" className="p-4 rounded-xl bg-surface border border-border">
      <p className="text-xs font-medium text-text-tertiary mb-3">여기서 시작해보세요</p>
      <div className="flex flex-col gap-2">
        {displayRecords.map((record) => (
          <Link
            key={record.slug}
            to={`/logs/${record.slug}`}
            className="text-sm text-text-secondary hover:text-ocean-blue transition-colors no-underline"
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
    <div className={cn("flex flex-col gap-3")}>
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
