import { Link } from "react-router";

interface SceneCardProps {
  record: {
    slug: string;
    title: string;
    content: string;
    format: "note" | "article";
    type: "personal" | "challenge" | "collaboration";
    rhythm?: string;
    createdAt: number;
  };
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
  sprint: "스프린트",
  weekly: "주간",
  monthly: "월간",
  free: "자유",
};

export default function SceneCard({
  record,
  author,
  stage,
  hasQuestions,
  hasSelfAnswers,
  hasLinkedRecord,
}: SceneCardProps) {
  const snippet =
    record.content.substring(0, 120) +
    (record.content.length > 120 ? "…" : "");

  return (
    <article
      data-testid="scene-card"
      className="rounded-lg border border-border bg-surface p-6 shadow-sm transition-transform duration-fast hover:-translate-y-px flex flex-col gap-4"
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
        <h3>{record.title}</h3>
      </Link>

      {/* Snippet */}
      <p className="text-base text-text-secondary leading-body m-0">
        {snippet}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            className="text-meta text-text-secondary no-underline"
          >
            {author.displayName}
          </Link>
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
