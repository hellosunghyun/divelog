import { Link } from "~/components/content/SmartLink";
import { EditedIndicator } from "~/components/ui/EditedIndicator";
import { motion } from "~/lib/motion/motion";

import { cn } from "~/lib/utils/cn";
import { RECORD_TYPE_LABELS, type RecordType } from "~/lib/constants/record-types";

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
    recordedAt?: number | null;
  };
  contentSnippet?: string;
  author?: {
    displayName: string;
    slug: string;
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
  weekly: "주간",
  monthly: "월간",
  stage: "구간",
  free: "자유",
};

const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem", "codeBlock"]);

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

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

  const rhythmLabel = record.rhythm ? (RHYTHM_LABELS[record.rhythm] ?? null) : null;
  const typeLabel = RECORD_TYPE_LABELS[record.type as RecordType] ?? record.type;
  const showRecordedAt = record.recordedAt && record.recordedAt !== record.createdAt;

  return (
    <motion.article
      data-testid="scene-card"
      data-read={isRead ? "true" : undefined}
      className={cn(
        "group relative p-1.5 rounded-2xl ring-1",
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption px-2.5 py-0.5 rounded-full bg-border text-text-secondary">
            {FORMAT_LABELS[record.format] ?? record.format}
          </span>
          <span className="text-caption px-2.5 py-0.5 rounded-full bg-mist-blue/50 text-ocean-blue">
            {typeLabel}
          </span>
          {rhythmLabel && (
            <span className="text-caption px-2.5 py-0.5 rounded-full bg-border text-text-secondary">
              {rhythmLabel}
            </span>
          )}
          {showRecordedAt && (
            <span className="text-caption px-2.5 py-0.5 rounded-full bg-mist-blue/60 text-ocean-blue">
              {formatShortDate(record.recordedAt!)}
            </span>
          )}
        </div>

        <Link
          to={`/logs/${record.slug}`}
          prefetch="intent"
          className={cn(
            "text-lg font-semibold leading-title no-underline",
            "after:absolute after:inset-0 after:rounded-2xl",
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
              <div className="flex items-center gap-2">
                {author && (
                  author.slug ? (
                    <Link
                      to={`/learners/${author.slug}`}
                      prefetch="intent"
                      className="relative z-10 text-meta text-text-secondary no-underline hover:text-ocean-blue transition-colors"
                    >
                      {author.displayName}
                    </Link>
                  ) : (
                    <span className="text-meta text-text-secondary">{author.displayName}</span>
                  )
                )}
                <span
                  className={cn("text-[11px]", isRead ? "text-[#A0A4AB]" : "text-text-tertiary/70")}
                  suppressHydrationWarning
                >
                  {formatRelativeTime(record.createdAt)}
                </span>
              </div>
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
