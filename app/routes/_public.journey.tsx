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
        <div className="bg-surface border-b border-border">
          <StageStrip stages={allStages} currentStageSlug={currentStage?.slug} />
        </div>
      )}

      <div className="max-w-content mx-auto px-4 py-12 md:py-20">
        {allStages.length === 0 ? (
          <EmptyState variant="generic" message="아직 Stage가 등록되지 않았습니다." />
        ) : (
          <div className="flex flex-col gap-4">
            {allStages.map((stage, index) => {
              const accentColor = STAGE_ACCENTS[stage.type] ?? "var(--color-ocean-blue)";
              const isCurrent = stage.isCurrent;

              return (
                <Link
                  key={stage.id}
                  to={`/journey/${stage.slug}`}
                  className="block bg-surface rounded-lg p-6 hover:bg-surface-secondary transition-colors"
                  style={{
                    border: isCurrent ? `1.5px solid ${accentColor}` : undefined,
                    opacity: stage.status === "upcoming" ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Stage number */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-meta font-semibold shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                        color: accentColor,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span
                          className="text-caption px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                            color: accentColor,
                          }}
                        >
                          {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
                        </span>
                        <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
                          {STATUS_LABELS[stage.status] ?? stage.status}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-caption px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            현재
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-text-primary mb-2">
                        {stage.name}
                      </h2>
                      {stage.description && (
                        <p className="text-base text-text-secondary leading-body">
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
