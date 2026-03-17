import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/cn";
import { motion } from "~/lib/motion";
import { fadeUp } from "~/lib/motion-utils";

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
  };
  author?: {
    displayName: string;
    slug: string;
  };
  isSelfAnswer?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  ResponseType,
  { label: string; accentClass: string }
> = {
  resonance: { label: "공명", accentClass: "border-reef-cyan" },
  question: { label: "질문", accentClass: "border-ocean-blue" },
  connection: { label: "연결", accentClass: "border-mist-blue/80" },
  suggestion: { label: "제안", accentClass: "border-deep-ocean/30" },
  self_answer: { label: "자기답변", accentClass: "border-ocean-blue/60" },
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
  isSelfAnswer,
  className,
}: ResponseCardProps) {
  const typeInfo = isResponseType(response.type)
    ? TYPE_CONFIG[response.type]
    : { label: response.type, accentClass: "border-border" };

  return (
    <motion.article
      data-testid="response-card"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative pl-4 border-l-2 rounded-r-xl bg-surface p-5",
        typeInfo.accentClass,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          {typeInfo.label}
        </span>
      </div>

      <p className="text-base leading-relaxed text-text-primary">
        {response.content}
      </p>

      <div className="mt-3 flex items-center gap-3 text-text-tertiary text-sm">
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            prefetch="viewport"
            className="no-underline hover:text-ocean-blue transition-colors"
          >
            {author.displayName}
          </Link>
        )}
        <span className="text-text-tertiary/60">
          {formatTimestamp(response.createdAt)}
        </span>
      </div>
    </motion.article>
  );
}
