import { Link } from "react-router";

interface Stage {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: "upcoming" | "active" | "completed";
  isCurrent?: boolean;
  order: number;
}

interface StageStripProps {
  stages: Stage[];
  currentStageSlug?: string;
}

const STAGE_ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  prelude: { bg: "bg-prelude/10", border: "border-prelude", text: "text-prelude" },
  bridge: { bg: "bg-bridge/10", border: "border-bridge", text: "text-bridge" },
  challenge: { bg: "bg-challenge/10", border: "border-challenge", text: "text-challenge" },
  epilogue: { bg: "bg-epilogue/10", border: "border-epilogue", text: "text-epilogue" },
};

export default function StageStrip({ stages, currentStageSlug }: StageStripProps) {
  return (
    <nav
      data-testid="stage-strip"
      aria-label="여정 Stage 목록"
      className="flex gap-3 overflow-x-auto p-4 scrollbar-thin"
    >
      {stages.map((stage) => {
        const isCurrent = stage.isCurrent || stage.slug === currentStageSlug;
        const accentClasses = STAGE_ACCENT_CLASSES[stage.type] ?? STAGE_ACCENT_CLASSES.challenge;

        let stageClasses = "flex-shrink-0 px-5 py-3 rounded-full text-sm whitespace-nowrap no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2";

        if (isCurrent) {
          stageClasses += ` ${accentClasses.bg} ${accentClasses.text} border-1.5 ${accentClasses.border} font-semibold`;
        } else if (stage.status === "completed") {
          stageClasses += " bg-transparent text-text-tertiary border border-border opacity-60 font-normal";
        } else if (stage.status === "upcoming") {
          stageClasses += " bg-transparent text-text-secondary border border-dashed border-border font-normal";
        } else {
          stageClasses += " bg-transparent text-text-secondary border border-border font-normal";
        }

        return (
          <Link
            key={stage.id}
            to={`/journey/${stage.slug}`}
            className={stageClasses}
            aria-current={isCurrent ? "page" : undefined}
          >
            {stage.name}
          </Link>
        );
      })}
    </nav>
  );
}
