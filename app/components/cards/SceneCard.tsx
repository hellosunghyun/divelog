import { Link } from "~/components/content/SmartLink";
import { EditedIndicator } from "~/components/ui/EditedIndicator";
import { motion } from "~/lib/motion/motion";

import { cn } from "~/lib/utils/cn";

interface Participant {
  displayName: string | null;
  profilePhotoUrl: string | null;
  role: string;
}

interface SceneCardProps {
  record: {
    slug: string;
    title: string;
    content: string;
    format: string;
    type: string;
    rhythm?: string;
    createdAt: number;
    updatedAt?: number;
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
  participants?: Participant[];
  hasQuestions?: boolean;
  hasSelfAnswers?: boolean;
  hasLinkedRecord?: boolean;
  isRead?: boolean;
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

const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem", "codeBlock"]);

function extractPlainTextFromJson(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type !== "doc") return null;
    const extract = (node: { type?: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> }): string => {
      if (node.type === "text") return node.text ?? "";
      if (node.type === "userMention" || node.type === "mention") {
        const label = (node.attrs?.label as string) ?? "";
        return label ? `@${label}` : "";
      }
      if (node.type === "recordRef") {
        return (node.attrs?.label as string) ?? "";
      }
      if (!Array.isArray(node.content)) return "";
      const childText = node.content.map((child) => extract(child as typeof node)).join("");
      if (node.type && BLOCK_TYPES.has(node.type) && childText) return childText + " ";
      return childText;
    };
    return extract(parsed).replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

export default function SceneCard({
  record,
  contentSnippet,
  author,
  stage,
  participants,
  hasQuestions,
  hasSelfAnswers,
  hasLinkedRecord,
  isRead,
}: SceneCardProps) {
  let snippet = contentSnippet;
  if (!snippet) {
    const text = (record.format === "article" ? extractPlainTextFromJson(record.content) : null) ?? record.content;
    snippet = text.substring(0, 120) + (text.length > 120 ? "…" : "");
  }

  const stageType = stage?.type?.toLowerCase() ?? "epilogue";
  const stageBadgeClass = stageToneClasses[stageType] ?? stageToneClasses.epilogue;

  return (
    <motion.article
      data-testid="scene-card"
      data-read={isRead ? "true" : undefined}
      className={cn(
        "group p-1.5 rounded-2xl ring-1",
        "hover:shadow-tinted-md transition-premium cursor-pointer",
        isRead
          ? "bg-[#ECEEF1] ring-[#D8DCE3]"
          : "bg-surface-secondary ring-border"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className={cn(
        "rounded-xl p-5 md:p-6 h-full flex flex-col gap-4",
        isRead ? "bg-[#F0F2F5]" : "bg-surface"
      )}>
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
          className={cn(
            "text-lg font-semibold leading-title no-underline",
            isRead ? "text-text-tertiary" : "text-text-primary"
          )}
        >
          <h3 className="tracking-tight">{record.title}</h3>
        </Link>

        <p className={cn(
          "text-base leading-body m-0",
          isRead ? "text-[#A0A4AB]" : "text-text-secondary"
        )}>
          {snippet}
        </p>

        <div className="flex items-center justify-between mt-2 border-t border-border-subtle pt-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
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
              {record.updatedAt && (
                <EditedIndicator createdAt={record.createdAt} updatedAt={record.updatedAt} />
              )}
            </div>

            {participants && participants.length > 0 && (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {participants.slice(0, 3).map((participant) => (
                    <div
                      key={`${participant.displayName ?? "unknown"}-${participant.role}`}
                      className="relative w-6 h-6 rounded-full ring-2 ring-surface overflow-hidden bg-surface-secondary flex items-center justify-center flex-shrink-0"
                      title={participant.displayName ?? "참여자"}
                    >
                      {participant.profilePhotoUrl ? (
                        <img
                          src={participant.profilePhotoUrl}
                          alt={participant.displayName ?? "참여자"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-medium text-text-secondary">
                          {participant.displayName?.[0] ?? "?"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {participants.length > 3 && (
                  <span className="ml-1.5 text-caption text-text-tertiary">
                    +{participants.length - 3}명
                  </span>
                )}
              </div>
            )}
          </div>

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
