import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

interface Stage {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  isCurrent?: boolean | number;
  order: number;
}

interface StageStripProps {
  stages: Stage[];
  currentStageSlug?: string;
}

const STAGE_ACCENT_CLASSES: Record<string, { glow: string; bg: string; text: string }> = {
  prelude: {
    glow: "shadow-[0_0_12px_rgba(74,141,168,0.25)]",
    bg: "bg-prelude",
    text: "text-white",
  },
  bridge: {
    glow: "shadow-[0_0_12px_rgba(26,158,180,0.3)]",
    bg: "bg-bridge",
    text: "text-white",
  },
  challenge: {
    glow: "shadow-[0_0_14px_rgba(11,36,71,0.35)]",
    bg: "bg-deep-ocean",
    text: "text-white",
  },
  epilogue: {
    glow: "shadow-[0_0_10px_rgba(126,142,158,0.2)]",
    bg: "bg-epilogue",
    text: "text-white",
  },
};

export default function StageStrip({ stages, currentStageSlug }: StageStripProps) {
  const currentIndex = stages.findIndex(
    (stage) => stage.isCurrent || stage.slug === currentStageSlug
  );

  return (
    <nav
      data-testid="stage-strip"
      aria-label="여정 Stage 목록"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 scrollbar-thin"
    >
      <div className="flex w-max min-w-full gap-2.5 sm:gap-3 py-5 md:px-6">
        {stages.map((stage, index) => {
          const isCurrent = stage.isCurrent || stage.slug === currentStageSlug;
          const isPast = currentIndex !== -1 && index < currentIndex;
          const isFuture = currentIndex !== -1 && index > currentIndex;
          const accentClasses = STAGE_ACCENT_CLASSES[stage.type] ?? STAGE_ACCENT_CLASSES.challenge;

          const baseClasses = cn(
            "flex-shrink-0 px-3 py-2.5 text-[13px] sm:px-5 sm:py-3 sm:text-sm rounded-full whitespace-nowrap no-underline",
            "transition-all duration-normal ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          );

          let stateClasses = "";

          if (isCurrent) {
            stateClasses = cn(
              accentClasses.bg,
              accentClasses.text,
              accentClasses.glow,
              "font-semibold",
              "hover:brightness-110"
            );
          } else if (isPast || stage.status === "completed") {
            stateClasses = cn(
              "bg-surface-secondary/70",
              "text-text-secondary",
              "border border-border-subtle",
              "font-normal",
              "hover:bg-surface-secondary hover:text-text-primary"
            );
          } else if (isFuture || stage.status === "upcoming") {
            stateClasses = cn(
              "bg-transparent",
              "text-text-secondary",
              "border border-dashed border-border",
              "font-normal",
              "hover:border-ocean-blue/40 hover:text-text-primary"
            );
          } else {
            stateClasses = cn(
              "bg-transparent",
              "text-text-secondary",
              "border border-border",
              "font-normal",
              "hover:border-ocean-blue/30"
            );
          }

           return (
             <Link
               key={stage.id}
               to={`/journey/${stage.slug}`}
               prefetch="intent"
               className={cn(baseClasses, stateClasses)}
               aria-current={isCurrent ? "page" : undefined}
             >
               {stage.name}
             </Link>
           );
        })}
      </div>
    </nav>
  );
}
