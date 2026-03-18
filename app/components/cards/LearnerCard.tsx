import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";
import { motion } from "~/lib/motion/motion";


interface LearnerCardProps {
  learner: {
    userId: string;
    slug: string;
    displayName: string;
    profilePhotoUrl?: string | null;
    cohort?: string | null;
    bio?: string | null;
    currentQuestion?: string | null;
  };
  recentRecord?: {
    slug: string;
    title: string;
  };
}

export default function LearnerCard({ learner, recentRecord }: LearnerCardProps) {
  return (
    <motion.article
      data-testid="learner-card"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "group bg-surface ring-1 ring-border rounded-2xl p-5",
        "hover:shadow-tinted-md transition-premium cursor-pointer"
      )}
    >
      {learner.currentQuestion && (
        <p className="text-base md:text-lg font-medium leading-relaxed text-text-primary mb-4 line-clamp-3">
          "{learner.currentQuestion}"
        </p>
      )}

      {!learner.currentQuestion && learner.bio && (
        <p className="text-base text-text-secondary leading-body line-clamp-2 mb-4">
          {learner.bio}
        </p>
      )}

      {!learner.currentQuestion && !learner.bio && (
        <p className="text-base text-text-tertiary italic mb-4">
          아직 질문이 없습니다
        </p>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        {learner.profilePhotoUrl ? (
          <img
            src={learner.profilePhotoUrl}
            alt={learner.displayName}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-mist-blue flex items-center justify-center text-sm text-ocean-blue font-medium">
            {learner.displayName[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/learners/${learner.slug}`}
            prefetch="viewport"
            className="text-sm font-semibold text-text-primary no-underline hover:text-ocean-blue transition-colors truncate block"
          >
            {learner.displayName}
          </Link>
          {learner.cohort && (
            <p className="text-xs text-text-tertiary m-0">{learner.cohort}</p>
          )}
        </div>
      </div>

      {recentRecord && (
        <Link
          to={`/logs/${recentRecord.slug}`}
          prefetch="viewport"
          className="block mt-3 text-xs text-text-tertiary no-underline hover:text-ocean-blue transition-colors truncate"
        >
          최근: {recentRecord.title}
        </Link>
      )}
    </motion.article>
  );
}
