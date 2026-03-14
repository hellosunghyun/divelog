import { Link } from "react-router";

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
  stage?: {
    name: string;
  };
}

export default function LearnerCard({ learner, recentRecord, stage }: LearnerCardProps) {
  return (
    <article
      data-testid="learner-card"
      className="bg-surface rounded-lg border border-border shadow-sm p-6 flex flex-col gap-4"
    >
      {/* Question FIRST — before profile (DOM order matters) */}
      {learner.currentQuestion && (
        <p className="text-lg text-ocean-blue leading-body italic">
          "{learner.currentQuestion}"
        </p>
      )}
      
      <div className="flex items-center gap-3">
        {learner.profilePhotoUrl ? (
          <img
            src={learner.profilePhotoUrl}
            alt={learner.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-mist-blue flex items-center justify-center text-base text-ocean-blue">
            {learner.displayName[0]}
          </div>
        )}
        <div>
          <Link 
            to={`/learners/${learner.slug}`} 
            className="font-semibold text-text-primary text-base hover:text-ocean-blue transition-colors"
          >
            {learner.displayName}
          </Link>
          {stage && (
            <p className="text-caption text-text-tertiary">{stage.name}</p>
          )}
        </div>
      </div>
      
      {learner.bio && (
        <p className="text-meta text-text-secondary leading-body">
          {learner.bio}
        </p>
      )}

      {recentRecord && (
        <Link 
          to={`/logs/${recentRecord.slug}`} 
          className="text-meta text-text-tertiary hover:text-ocean-blue transition-colors"
        >
          최근: {recentRecord.title}
        </Link>
      )}
    </article>
  );
}
