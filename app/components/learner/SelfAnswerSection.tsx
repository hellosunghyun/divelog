import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

interface SelfAnswer {
  id: string;
  questionTitle: string;
  snippet: string;
  recordSlug: string;
}

interface SelfAnswerSectionProps {
  selfAnswers: SelfAnswer[];
  className?: string;
}

export default function SelfAnswerSection({
  selfAnswers,
  className,
}: SelfAnswerSectionProps) {
  if (selfAnswers.length === 0) {
    return (
      <section
        data-testid="self-answer-section"
        className={cn("py-8", className)}
      >
        <h2 className="text-xl font-semibold text-text-primary mb-6 tracking-tight">
          자기답변
        </h2>
        <p className="text-text-secondary text-base leading-body">
          아직 자기답변이 없습니다
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="self-answer-section"
      className={cn("py-8", className)}
    >
      <h2 className="text-xl font-semibold text-text-primary mb-6 tracking-tight">
        자기답변
      </h2>

      <div className="space-y-4">
        {selfAnswers.map((selfAnswer) => (
          <Link
            key={selfAnswer.id}
            to={`/logs/${selfAnswer.recordSlug}`}
            prefetch="viewport"
            className="block min-w-0 no-underline"
          >
            <article
              data-testid="self-answer-card"
              className={cn(
                "min-w-0 rounded-2xl border border-[#E3E8EF] bg-white p-5",
                "hover:border-ocean-blue/40 transition-colors duration-200",
                "focus-within:ring-2 focus-within:ring-ocean-blue focus-within:ring-offset-2"
              )}
            >
              <h3 className="mb-2 break-words text-base font-semibold leading-snug text-text-primary">
                {selfAnswer.questionTitle}
              </h3>
              <p className="break-words text-sm text-text-secondary leading-relaxed line-clamp-2">
                {selfAnswer.snippet}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
