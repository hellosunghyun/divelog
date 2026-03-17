import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/cn";
import { motion } from "~/lib/motion";
import { fadeUp } from "~/lib/motion-utils";

import { Button } from "~/components/ui/button";

interface QuestionCardProps {
  question: {
    id: string;
    content: string;
    direction?: string;
    isOpen?: boolean;
  };
  record?: {
    slug: string;
    title: string;
  };
  onRespond?: () => void;
  className?: string;
}

const DIRECTION_LABELS: Record<string, string> = {
  inward: "스스로에게 묻다",
  next_stage: "다음 구간으로 가져갈 질문",
  outward: "함께 생각해볼 질문",
};

export default function QuestionCard({
  question,
  record,
  onRespond,
  className,
}: QuestionCardProps) {
  const directionLabel =
    DIRECTION_LABELS[question.direction || "outward"] || "남겨진 질문";

  return (
    <motion.article
      data-testid="question-card"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "bg-mist-blue/30 rounded-2xl p-6 md:p-8 border border-mist-blue",
        className
      )}
    >
      <span className="text-xs font-medium text-ocean-blue uppercase tracking-wide">
        {directionLabel}
      </span>

      <p className="text-xl md:text-2xl font-medium leading-relaxed text-text-primary mt-3 mb-6">
        {question.content}
      </p>

      {record && (
        <div className="mb-4">
          <Link
            to={`/logs/${record.slug}`}
            prefetch="viewport"
            className="text-sm text-text-tertiary no-underline hover:text-ocean-blue transition-colors"
          >
            ← {record.title}
          </Link>
        </div>
      )}

      {question.isOpen !== false && onRespond && (
        <Button
          type="button"
          variant="ghost"
          onClick={onRespond}
          className="h-auto rounded-full border border-border bg-transparent px-5 py-2.5 text-sm text-text-secondary hover:border-ocean-blue/30 hover:bg-mist-blue/50 hover:text-ocean-blue focus-visible:ring-ocean-blue transition-all duration-normal"
        >
          이 질문에 응답하기
        </Button>
      )}
    </motion.article>
  );
}
