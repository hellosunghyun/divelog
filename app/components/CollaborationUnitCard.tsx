import { Link } from "react-router";

interface CollaborationUnitCardProps {
  unit: {
    id: string;
    slug: string;
    name: string;
    currentQuestion?: string | null;
    status: string;
    description?: string | null;
  };
  memberCount?: number;
  challenge?: {
    name: string;
    slug: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  forming: "구성 중",
  active: "탐구 중",
  restructured: "재편성됨",
  archived: "아카이브",
};

export default function CollaborationUnitCard({ unit, memberCount, challenge }: CollaborationUnitCardProps) {
  return (
    <article
      data-testid="collaboration-card"
      className="bg-surface rounded-lg border border-border shadow-sm p-6 flex flex-col gap-4"
    >
      <div>
        <span className={
          `text-caption px-2 py-0.5 rounded-full font-medium ` +
          (unit.status === "active" 
            ? "bg-mist-blue text-ocean-blue" 
            : "bg-border text-text-secondary")
        }>
          {STATUS_LABELS[unit.status] ?? unit.status}
        </span>
      </div>
      
      {/* Team Question FIRST — before team intro (DOM order matters) */}
      {unit.currentQuestion && (
        <p className="text-lg text-ocean-blue leading-body italic">
          "{unit.currentQuestion}"
        </p>
      )}

      <Link 
        to={`/groups/${unit.slug}`} 
        className="font-semibold text-text-primary text-lg hover:text-ocean-blue transition-colors"
      >
        {unit.name}
      </Link>
      
      {unit.description && (
        <p className="text-meta text-text-secondary">
          {unit.description}
        </p>
      )}

      <div className="flex gap-4 text-meta text-text-tertiary">
        {memberCount !== undefined && <span>팀원 {memberCount}명</span>}
        {challenge && (
          <Link 
            to={`/challenges/${challenge.slug}`}
            className="hover:text-ocean-blue transition-colors"
          >
            {challenge.name}
          </Link>
        )}
      </div>
    </article>
  );
}
