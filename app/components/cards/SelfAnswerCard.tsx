import { cn } from "~/lib/utils/cn";
import { motion } from "~/lib/motion/motion";
import { fadeUp } from "~/lib/motion/motion-utils";

interface SelfAnswerCardProps {
  selfAnswer: {
    id: string;
    content: string;
    createdAt: number;
    author?: {
      displayName: string | null;
      profilePhotoUrl: string | null;
    } | null;
  };
  className?: string;
}

function formatTimestamp(unixEpoch: number): string {
  const date = new Date(unixEpoch * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function SelfAnswerCard({
  selfAnswer,
  className,
}: SelfAnswerCardProps) {
  return (
    <motion.article
      data-testid="self-answer-card"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative pl-4 border-l-2 border-ocean-blue/60 rounded-r-xl bg-surface p-5",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium text-ocean-blue uppercase tracking-wide">
          자기답변
        </span>
        <span className="text-sm text-text-tertiary/60">
          {formatTimestamp(selfAnswer.createdAt)}
        </span>
      </div>

      <p className="text-base leading-relaxed text-text-primary whitespace-pre-wrap">
        {selfAnswer.content}
      </p>
    </motion.article>
  );
}
