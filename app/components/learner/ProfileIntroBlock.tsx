import { Link } from "~/components/content/SmartLink";

interface ProfileIntroBlockProps {
  profileIntro: string | null;
  contextLine: string | null;
  interestTags: Array<{ slug: string; name: string }>;
  currentQuestion: string | null;
}

export default function ProfileIntroBlock({
  profileIntro,
  contextLine,
  interestTags,
  currentQuestion,
}: ProfileIntroBlockProps) {
  if (!profileIntro && interestTags.length === 0 && !currentQuestion) {
    return null;
  }

  return (
    <div data-testid="profile-intro-block" className="min-w-0 space-y-6">
      {currentQuestion && (
        <div data-testid="current-question">
          <p className="break-words text-base md:text-lg font-medium leading-relaxed text-text-primary">
            "{currentQuestion}"
          </p>
        </div>
      )}

      {profileIntro && (
        <p className="break-words text-sm text-text-secondary leading-body">
          {profileIntro}
        </p>
      )}

      {contextLine && (
        <p className="break-words text-xs text-text-tertiary">{contextLine}</p>
      )}

      {interestTags.length > 0 && (
        <div data-testid="interest-tags" className="min-w-0 flex flex-wrap gap-2">
          {interestTags.map((tag) => (
            <Link
              key={tag.slug}
              to={`/tags/${tag.slug}`}
              className="min-w-0 break-words rounded-full px-3 py-1.5 text-xs font-medium bg-surface border border-border text-text-secondary hover:bg-mist-blue hover:text-ocean-blue hover:border-reef-cyan/30 transition-all duration-normal no-underline"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
