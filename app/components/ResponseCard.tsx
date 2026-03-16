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
  self_answer: { label: "자기답변", color: "text-epilogue", bgClass: "bg-epilogue-bg" },
};

function isResponseType(type: string): type is ResponseType {
  return type in TYPE_LABELS;
}

export default function ResponseCard({ response, author, isSelfAnswer }: ResponseCardProps) {
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
      className={`rounded-2xl border p-5 flex flex-col gap-3 shadow-card transition-all duration-normal hover:shadow-card-hover hover:-translate-y-0.5 ${
        isSelfAnswer ? "bg-mist-blue border-reef-cyan" : "bg-surface border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-caption px-2 py-0.5 rounded-full font-medium ${typeInfo.bgClass} ${typeInfo.color}`}
        >
          {typeInfo.label}
        </span>
        {author && (
          <Link
            to={`/learners/${author.slug}`}
            prefetch="viewport"
            className="text-meta text-text-tertiary no-underline"
          >
            {author.displayName}
          </Link>
        )}
      </div>

      <p className="text-base leading-body text-text-primary m-0">
        {response.content}
      </p>
    </article>
  );
}
