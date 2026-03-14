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

const STAGE_ACCENT: Record<string, string> = {
  prelude: "var(--color-prelude)",
  bridge: "var(--color-bridge)",
  challenge: "var(--color-challenge)",
  epilogue: "var(--color-epilogue)",
};

export default function StageStrip({ stages, currentStageSlug }: StageStripProps) {
  return (
    <nav
      data-testid="stage-strip"
      aria-label="여정 Stage 목록"
      style={{
        overflowX: "auto",
        display: "flex",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        scrollbarWidth: "thin",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {stages.map((stage) => {
        const isCurrent = stage.isCurrent || stage.slug === currentStageSlug;
        const accentColor = STAGE_ACCENT[stage.type] ?? "var(--color-ocean-blue)";
        return (
          <Link
            key={stage.id}
            to={`/journey/${stage.slug}`}
            style={{
              flexShrink: 0,
              padding: "var(--space-3) var(--space-5)",
              borderRadius: "var(--radius-full)",
              fontSize: "14px",
              fontWeight: isCurrent ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              color: isCurrent ? accentColor : stage.status === "completed" ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              backgroundColor: isCurrent ? `color-mix(in srgb, ${accentColor} 10%, transparent)` : "transparent",
              border: isCurrent ? `1.5px solid ${accentColor}` : stage.status === "upcoming" ? "1px dashed var(--color-border)" : "1px solid var(--color-border)",
              opacity: stage.status === "completed" ? 0.6 : 1,
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
            aria-current={isCurrent ? "page" : undefined}
          >
            {stage.name}
          </Link>
        );
      })}
    </nav>
  );
}
