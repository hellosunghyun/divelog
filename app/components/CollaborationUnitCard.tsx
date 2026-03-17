import { Link } from "~/components/SmartLink";
import { cn } from "~/lib/cn";
import { motion } from "~/lib/motion";
import { fadeUp } from "~/lib/motion-utils";

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

const STATUS_CLASSES: Record<string, string> = {
  forming: "bg-mist-blue text-ocean-blue",
  active: "bg-reef-cyan/20 text-deep-ocean",
  restructured: "bg-border text-text-secondary",
  archived: "bg-surface-secondary text-text-tertiary",
};

export default function CollaborationUnitCard({ unit, memberCount, challenge }: CollaborationUnitCardProps) {
  return (
    <motion.article
      data-testid="collaboration-card"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "group bg-surface ring-1 ring-border rounded-2xl p-5",
        "hover:shadow-tinted-md transition-premium cursor-pointer"
      )}
    >
      {unit.currentQuestion && (
        <p className="text-base md:text-lg font-medium leading-relaxed text-text-primary mb-4 line-clamp-3">
          "{unit.currentQuestion}"
        </p>
      )}

      {!unit.currentQuestion && unit.description && (
        <p className="text-base text-text-secondary leading-body line-clamp-2 mb-4">
          {unit.description}
        </p>
      )}

      {!unit.currentQuestion && !unit.description && (
        <p className="text-base text-text-tertiary italic mb-4">
          아직 질문이 없습니다
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="min-w-0 flex-1">
          <Link
            to={`/groups/${unit.slug}`}
            prefetch="viewport"
            className="text-sm font-semibold text-text-primary no-underline hover:text-ocean-blue transition-colors truncate block"
          >
            {unit.name}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full font-medium",
                STATUS_CLASSES[unit.status] ?? STATUS_CLASSES.archived
              )}
            >
              {STATUS_LABELS[unit.status] ?? unit.status}
            </span>
            {memberCount !== undefined && (
              <>
                <span>·</span>
                <span>팀원 {memberCount}명</span>
              </>
            )}
          </div>
        </div>

        {challenge && (
          <Link
            to={`/challenges/${challenge.slug}`}
            prefetch="viewport"
            className="text-xs text-text-tertiary no-underline hover:text-ocean-blue transition-colors ml-2 shrink-0"
          >
            {challenge.name}
          </Link>
        )}
      </div>
    </motion.article>
  );
}
