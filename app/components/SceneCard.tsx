import { Link } from "react-router";

interface SceneCardProps {
  record: {
    slug: string;
    title: string;
    content: string;
    format: string;
    type: string;
    rhythm?: string;
    createdAt: number;
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
  hasQuestions?: boolean;
  hasSelfAnswers?: boolean;
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

  return (
    <article
      data-testid="scene-card"
      className="rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-normal hover:shadow-card-hover hover:-translate-y-0.5 flex flex-col gap-4"
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
              className="text-meta text-text-secondary no-underline hover:text-ocean-blue transition-colors"
            >
              {author.displayName}
            </Link>
          ) : (
            <span className="text-meta text-text-secondary">{author.displayName}</span>
          )
        )}

        {/* Indicator icons */}
        <div className={`flex gap-2 ${author ? "ml-auto" : ""}`}>
          {hasQuestions && (
            <span
              title="열린 질문 있음"
              className="text-caption text-ocean-blue"
              role="img"
              aria-label="열린 질문 있음"
            >
              ?
            </span>
          )}
          {hasSelfAnswers && (
            <span
              title="자기답변 있음"
              className="text-caption text-bridge"
              role="img"
              aria-label="자기답변 있음"
            >
              ↩
            </span>
          )}
          {hasLinkedRecord && (
            <span
              title="이어진 기록 있음"
              className="text-caption text-text-tertiary"
              role="img"
              aria-label="이어진 기록 있음"
            >
              →
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
