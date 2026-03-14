import type { Route } from "./+types/_public.journey";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages } from "../db/schema.server";
import { sql } from "drizzle-orm";
import StageStrip from "../components/StageStrip";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "여정 — divelog" },
    { name: "description", content: "ADA Learner의 아홉 달 여정 구조를 탐색합니다" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const allStages = await database.select().from(stages).orderBy(sql`"order" ASC`);
  const currentStage = allStages.find((s) => s.isCurrent) ?? null;
  return { stages: allStages, currentStage };
}

const STAGE_TYPE_LABELS: Record<string, string> = {
  prelude: "탐색",
  bridge: "전환",
  challenge: "도전",
  epilogue: "성찰",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: "예정",
  active: "진행 중",
  completed: "완료",
};

const STAGE_ACCENTS: Record<string, string> = {
  prelude: "var(--color-prelude)",
  bridge: "var(--color-bridge)",
  challenge: "var(--color-challenge)",
  epilogue: "var(--color-epilogue)",
};

export default function JourneyPage({ loaderData }: Route.ComponentProps) {
  const { stages: allStages, currentStage } = loaderData;

  return (
    <div>
      <HeroSection
        variant="stage"
        title="여정"
        subtitle="ADA Learner의 아홉 달은 여러 Stage로 구성됩니다. 각 Stage마다 탐구와 기록이 쌓입니다."
      />

      {/* Stage Strip */}
      {allStages.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <StageStrip stages={allStages} currentStageSlug={currentStage?.slug} />
        </div>
      )}

      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto", padding: "var(--space-12) var(--space-4)" }}>
        {allStages.length === 0 ? (
          <EmptyState variant="generic" message="아직 Stage가 등록되지 않았습니다." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {allStages.map((stage, index) => {
              const accentColor = STAGE_ACCENTS[stage.type] ?? "var(--color-ocean-blue)";
              const isCurrent = stage.isCurrent;

              return (
                <Link
                  key={stage.id}
                  to={`/journey/${stage.slug}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    backgroundColor: "var(--color-surface)",
                    borderRadius: "var(--radius-lg)",
                    border: isCurrent ? `1.5px solid ${accentColor}` : "1px solid var(--color-border)",
                    padding: "var(--space-6)",
                    opacity: stage.status === "upcoming" ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
                    {/* Stage number */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                        color: accentColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: "var(--font-weight-semibold)",
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                            color: accentColor,
                          }}
                        >
                          {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--color-border)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {STATUS_LABELS[stage.status] ?? stage.status}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: "12px",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              backgroundColor: accentColor,
                              color: "white",
                            }}
                          >
                            현재
                          </span>
                        )}
                      </div>
                      <h2
                        style={{
                          fontSize: "var(--font-size-xl)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-primary)",
                          marginBottom: stage.description ? "var(--space-2)" : 0,
                        }}
                      >
                        {stage.name}
                      </h2>
                      {stage.description && (
                        <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
