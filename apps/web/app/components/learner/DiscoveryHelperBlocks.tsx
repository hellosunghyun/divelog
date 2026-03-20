import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

interface StarterLinksBlockProps {
  records: Array<{ slug: string; title: string }>;
}

export function StarterLinksBlock({ records }: StarterLinksBlockProps) {
  const displayRecords = records.slice(0, 2);

  if (displayRecords.length === 0) return null;

  return (
    <div data-testid="starter-links" className="min-w-0 mb-8">
      <p className="text-xs font-medium text-text-tertiary mb-2">여기서 시작해보세요</p>
      <div className="flex flex-col gap-1">
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

interface CurrentStageBlockProps {
  stage: { id: string; name: string; slug: string };
}

export function CurrentStageBlock({ stage }: CurrentStageBlockProps) {
  return (
    <Link
      to={`/journey/${stage.slug}`}
      data-testid="current-stage-block"
      className="inline-flex items-center gap-2 rounded-full bg-mist-blue px-4 py-2 text-sm font-medium text-ocean-blue transition-colors no-underline hover:bg-reef-cyan/30"
    >
      <span className="text-text-tertiary">현재 여정</span>
      <span>{stage.name}</span>
    </Link>
  );
}

interface DiscoveryHelperBlocksProps {
  currentStage: { id: string; name: string; slug: string } | null;
  recentActivity: { recordCount: number; questionCount: number; lastActiveAt: string | null } | null;
  starterRecords: Array<{ slug: string; title: string }>;
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

  const activityParts: string[] = [];
  if (recentActivity && recentActivity.recordCount > 0) {
    activityParts.push(`기록 ${recentActivity.recordCount}개`);
  }
  if (recentActivity && recentActivity.questionCount > 0) {
    activityParts.push(`질문 ${recentActivity.questionCount}개`);
  }

  return (
    <div className={cn("min-w-0 flex flex-col gap-3")}>
      {hasStage && <CurrentStageBlock stage={currentStage} />}
      {hasActivity && (
        <p data-testid="recent-activity-block" className="text-sm text-text-tertiary">
          {activityParts.join(" · ")}
        </p>
      )}
      {hasStarterRecords && <StarterLinksBlock records={starterRecords} />}
    </div>
  );
}
