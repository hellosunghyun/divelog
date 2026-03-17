import { Link } from "~/components/content/SmartLink";
import { motion } from "~/lib/motion";
import { fadeUp } from "~/lib/motion-utils";
import { cn } from "~/lib/cn";

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

const stageToneClasses: Record<string, string> = {
  prelude: "bg-mist-blue text-ocean-blue",
  bridge: "bg-reef-cyan/20 text-ocean-blue",
  challenge: "bg-deep-ocean/10 text-deep-ocean",
  epilogue: "bg-surface-secondary text-text-secondary border border-border",
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

  const stageType = stage?.type?.toLowerCase() ?? "epilogue";
  const stageBadgeClass = stageToneClasses[stageType] ?? stageToneClasses.epilogue;

  return (
    <motion.article
      data-testid="scene-card"
      className={cn(
        "group bg-surface-secondary ring-1 ring-border p-1.5 rounded-2xl",
        "hover:shadow-tinted-md transition-premium cursor-pointer"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={fadeUp}
    >
      <div className="bg-surface rounded-xl p-5 md:p-6 h-full flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {stage && (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", stageBadgeClass)}>
              {stage.name}
            </span>
          )}
          <span className="text-caption px-2.5 py-0.5 rounded-full bg-border text-text-secondary">
            {FORMAT_LABELS[record.format] ?? record.format}
          </span>
          {record.rhythm && record.rhythm !== "free" && (
            <span className="text-caption px-2.5 py-0.5 rounded-full bg-border text-text-secondary">
              {RHYTHM_LABELS[record.rhythm] ?? record.rhythm}
            </span>
          )}
        </div>

        <Link
          to={`/logs/${record.slug}`}
          prefetch="viewport"
          className="text-lg font-semibold text-text-primary leading-title no-underline"
        >
          <h3 className="tracking-tight">{record.title}</h3>
        </Link>

        <p className="text-base text-text-secondary leading-body m-0">
          {snippet}
        </p>

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

          <div className={cn("flex gap-2", author && "ml-auto")}>
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
      </div>
    </motion.article>
  );
}
