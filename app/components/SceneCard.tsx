import { Link } from "~/components/SmartLink";

interface SceneCardProps {
  record: {
    slug: string;
    title: string;
    content: string;
    format: string;
    type: string;
    rhythm?: string;
    createdAt: number;
    questionCount?: number;
    selfAnswerCount?: number;
    linkedCount?: number;
  };
  contentSnippet?: string;
  author?: {
    displayName: string;
    slug: string;
  };
  stage?: {
    name: string;
    type: string;
  };
  /** @deprecated Use record.questionCount instead */
  hasQuestions?: boolean;
  /** @deprecated Use record.selfAnswerCount instead */
  hasSelfAnswers?: boolean;
  /** @deprecated Use record.linkedCount instead */
  hasLinkedRecord?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  note: "노트",
  article: "글",
};

const RHYTHM_LABELS: Record<string, string> = {
  moment: "순간",
  sprint: "스프린트",
  weekly: "주간",
  monthly: "월간",
  stage: "구간 회고",
  reflection: "개인 회고",
  free: "자유",
};

export default function SceneCard({
  record,
  contentSnippet,
  author,
  stage,
  hasQuestions,
  hasSelfAnswers,
  hasLinkedRecord,
}: SceneCardProps) {
  const snippet =
    contentSnippet ??
    (record.content.substring(0, 120) + (record.content.length > 120 ? "…" : ""));

  const questionCount = record.questionCount ?? (hasQuestions ? 1 : 0);
  const selfAnswerCount = record.selfAnswerCount ?? (hasSelfAnswers ? 1 : 0);
  const linkedCount = record.linkedCount ?? (hasLinkedRecord ? 1 : 0);

  const hasSelfAnswer = selfAnswerCount > 0;

  return (
    <article
      data-testid="scene-card"
      className={`rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-normal hover:shadow-card-hover hover:-translate-y-0.5 flex flex-col gap-4 ${hasSelfAnswer ? 'border-l-2 border-l-reef-cyan' : ''}`}
    >
      {/* Stage + Format badges */}
      <div className="flex gap-2 flex-wrap">
        {stage && (
          <span className="text-caption px-2 py-0.5 rounded-full bg-mist-blue text-ocean-blue">
            {stage.name}
          </span>
        )}
        <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
          {FORMAT_LABELS[record.format] ?? record.format}
        </span>
        {record.rhythm && record.rhythm !== "free" && (
          <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
            {RHYTHM_LABELS[record.rhythm] ?? record.rhythm}
          </span>
        )}
      </div>

      {/* Title */}
      <Link
        to={`/logs/${record.slug}`}
        prefetch="viewport"
        className="text-lg font-semibold text-text-primary leading-title no-underline"
      >
        <h3 className="tracking-tight">{record.title}</h3>
      </Link>

      {/* Snippet */}
      <p className="text-base text-text-secondary leading-body m-0">
        {snippet}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 border-t border-border-subtle pt-4">
        {author && (
          author.slug ? (
            <Link
              to={`/learners/${author.slug}`}
              prefetch="viewport"
              className="text-meta text-text-secondary no-underline hover:text-ocean-blue transition-colors"
            >
              {author.displayName}
            </Link>
          ) : (
            <span className="text-meta text-text-secondary">{author.displayName}</span>
          )
        )}

        {/* Indicator badges */}
        <div className={`flex gap-1.5 ${author ? "ml-auto" : ""}`}>
          {questionCount > 0 && (
            <span
              data-testid="card-badge-question"
              title="질문이 남겨진 기록"
              className="text-xs px-1.5 py-0.5 rounded-md bg-mist-blue text-ocean-blue font-medium"
            >
              Q
            </span>
          )}
          {selfAnswerCount > 0 && (
            <span
              data-testid="card-badge-self-answer"
              title="자기답변이 있는 기록"
              className="text-xs px-1.5 py-0.5 rounded-md bg-mist-blue text-ocean-blue font-medium"
            >
              ↺
            </span>
          )}
          {linkedCount > 0 && (
            <span
              data-testid="card-badge-linked"
              title="이어진 기록이 있음"
              className="text-xs px-1.5 py-0.5 rounded-md bg-surface-secondary text-text-secondary font-medium"
            >
              ∞
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
