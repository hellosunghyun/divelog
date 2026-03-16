import { Link } from "~/components/SmartLink";

type ResponseType = "resonance" | "question" | "connection" | "suggestion" | "self_answer";

interface ResponseCardProps {
  response: {
    id: string;
    type: string;
    content: string;
    createdAt: number;
  };
  author?: {
    displayName: string;
    slug: string;
  };
  isSelfAnswer?: boolean;
}

const TYPE_LABELS: Record<ResponseType, { label: string; color: string; bgClass: string }> = {
  resonance: { label: "공명", color: "text-prelude", bgClass: "bg-prelude-bg" },
  question: { label: "질문", color: "text-ocean-blue", bgClass: "bg-mist-blue" },
  connection: { label: "연결", color: "text-bridge", bgClass: "bg-bridge-bg" },
  suggestion: { label: "제안", color: "text-challenge", bgClass: "bg-challenge-bg" },
  self_answer: { label: "자기답변", color: "text-ocean-blue", bgClass: "bg-mist-blue" },
};

function isResponseType(type: string): type is ResponseType {
  return type in TYPE_LABELS;
}

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

  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function ResponseCard({ response, author, isSelfAnswer }: ResponseCardProps) {
  const isSelfAnswerResponse = isSelfAnswer ?? response.type === "self_answer";

  const typeInfo = isResponseType(response.type)
    ? TYPE_LABELS[response.type]
    : {
        label: response.type,
        color: "text-text-secondary",
        bgClass: "bg-border",
      };

  return (
    <article
      data-testid="response-card"
      className={`
        rounded-[20px] border p-5 sm:p-6 flex flex-col gap-3
        transition-shadow duration-normal
        ${isSelfAnswerResponse
          ? "bg-mist-blue/40 border-border border-l-4 border-l-reef-cyan"
          : "bg-surface border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        }
      `}
    >
      {isSelfAnswerResponse && (
        <div className="flex items-center gap-1.5 -mt-1">
          <span className="text-caption font-medium text-ocean-blue">↺ 자기답변</span>
          <span className="text-caption text-text-tertiary">
            시간이 지나 다시 돌아와 쓴 답변
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span
          className={`text-caption px-2 py-0.5 rounded-full font-medium ${typeInfo.bgClass} ${typeInfo.color}`}
        >
          {typeInfo.label}
        </span>
      </div>

      <p className="text-base leading-relaxed text-text-primary m-0">
        {response.content}
      </p>

      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-border">
        {author ? (
          <>
            <Link
              to={`/learners/${author.slug}`}
              prefetch="viewport"
              className="text-meta text-text-secondary no-underline hover:text-ocean-blue transition-colors"
            >
              {author.displayName}
            </Link>
            <span className="text-meta text-text-tertiary">·</span>
          </>
        ) : null}
        <time
          dateTime={new Date(response.createdAt * 1000).toISOString()}
          className="text-meta text-text-tertiary"
        >
          {formatRelativeTime(response.createdAt)}
        </time>
      </div>
    </article>
  );
}
