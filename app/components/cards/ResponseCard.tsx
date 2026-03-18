import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "~/components/ui/alert-dialog";
import { EditedIndicator } from "~/components/ui/EditedIndicator";

type ResponseType =
  | "resonance"
  | "question"
  | "connection"
  | "suggestion"
  | "self_answer";

interface ResponseCardProps {
  response: {
    id: string;
    type: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    authorId: string;
    moderationStatus?: string;
  };
  author?: {
    displayName: string;
    slug: string;
  };
  currentUserId?: string | null;
  onEdit?: (responseId: string) => void;
  onDelete?: (responseId: string) => void;
  onReply?: (responseId: string) => void;
  isSelfAnswer?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  ResponseType,
  { label: string; chipClass: string }
> = {
  resonance: { label: "공명", chipClass: "bg-reef-cyan/20 text-teal-700" },
  question: { label: "질문", chipClass: "bg-ocean-blue/15 text-ocean-blue" },
  connection: { label: "연결", chipClass: "bg-mist-blue/50 text-ocean-blue/80" },
  suggestion: { label: "제안", chipClass: "bg-deep-ocean/10 text-deep-ocean/80" },
  self_answer: { label: "자기답변", chipClass: "bg-ocean-blue/15 text-ocean-blue" },
};

function isResponseType(type: string): type is ResponseType {
  return type in TYPE_CONFIG;
}

function formatTimestamp(unixEpoch: number): string {
  const date = new Date(unixEpoch * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function ResponseCard({
  response,
  author,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  isSelfAnswer,
  className,
}: ResponseCardProps) {
  const typeInfo = isResponseType(response.type)
    ? TYPE_CONFIG[response.type]
    : { label: response.type, chipClass: "bg-surface-secondary text-text-secondary" };

  const isOwner = currentUserId != null && response.authorId === currentUserId;
  const isEdited = response.updatedAt > response.createdAt;

  return (
    <article
      data-testid="response-card"
      className={cn(
        "rounded-2xl bg-surface border border-border p-5 md:p-6 transition-colors hover:border-border/80",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full",
          typeInfo.chipClass
        )}>
          {typeInfo.label}
        </span>
      </div>

      <p className="text-base leading-relaxed text-text-primary">
        {response.content}
      </p>

      <div className="mt-4 flex items-center gap-3 text-text-tertiary text-sm flex-wrap">
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            prefetch="viewport"
            className="no-underline hover:text-ocean-blue transition-colors"
          >
            {author.displayName}
          </Link>
        )}
        <span>{formatTimestamp(response.createdAt)}</span>
        {isEdited && (
          <EditedIndicator createdAt={response.createdAt} updatedAt={response.updatedAt} />
        )}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
        {onReply && response.moderationStatus !== "tombstone" && (
          <button
            type="button"
            onClick={() => onReply(response.id)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            답글
          </button>
        )}
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => onEdit?.(response.id)}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              수정
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-red-600/70 hover:text-red-600 transition-colors"
                >
                  삭제
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>응답을 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    삭제된 응답은 복구할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete?.(response.id)}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </article>
  );
}
