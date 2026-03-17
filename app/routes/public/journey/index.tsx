import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { stages } from "~/db/schema.server";
import { sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

type Stage = InferSelectModel<typeof stages>;
import { motion } from "~/lib/motion";
import { staggerContainer, staggerItem } from "~/lib/motion-utils";
import { cn } from "~/lib/cn";
import StageStrip from "~/components/StageStrip";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { createLogger } from "~/lib/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "여정 — DiveLog" },
    { name: "description", content: "ADA 러너의 아홉 달 여정 구조를 탐색합니다" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "journey" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const allStages = await database.select().from(stages).orderBy(sql`"order" ASC`);
  const currentStage = allStages.find((s) => s.isCurrent) ?? null;
  logger.info("loader_end");
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
        subtitle="ADA 러너의 아홉 달은 여러 Stage로 구성됩니다. 각 Stage마다 탐구와 기록이 쌓입니다."
      />

      {allStages.length > 0 && (
        <div className="bg-surface border-b border-border">
          <div className="max-w-content mx-auto px-6">
            <StageStrip stages={allStages} currentStageSlug={currentStage?.slug} />
          </div>
        </div>
      )}

      <div className="max-w-content mx-auto px-6 py-16 md:py-24">
        {allStages.length === 0 ? (
          <EmptyState variant="generic" message="아직 Stage가 등록되지 않았습니다." />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5"
          >
            {allStages.map((stage, index: number) => {
              const accentColor = STAGE_ACCENTS[stage.type] ?? "var(--color-ocean-blue)";
              const isCurrent = stage.isCurrent;

              return (
                <motion.div key={stage.id} variants={staggerItem}>
                  <Link
                    to={`/journey/${stage.slug}`}
                    className={cn(
                      "group block no-underline",
                      "ring-1 ring-border p-1.5 md:p-2 rounded-2xl",
                      "hover:shadow-tinted-md transition-premium",
                      stage.status === "upcoming" && "opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-xl p-6 md:p-7 h-full",
                        isCurrent
                          ? "bg-gradient-to-br from-mist-blue/50 via-surface to-mist-blue/30"
                          : "bg-surface"
                      )}
                    >
                      <div className="flex items-start gap-5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                            color: accentColor,
                          }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex gap-2 mb-3 flex-wrap">
                            <span
                              className="text-caption font-medium px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                                color: accentColor,
                              }}
                            >
                              {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
                            </span>
                            <span className="text-caption font-medium px-2.5 py-0.5 rounded-full bg-surface-secondary text-text-secondary">
                              {STATUS_LABELS[stage.status] ?? stage.status}
                            </span>
                            {isCurrent && (
                              <span
                                className="text-caption font-bold px-2.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: accentColor }}
                              >
                                현재
                              </span>
                            )}
                          </div>

                          <h2 className="text-xl font-bold text-deep-ocean tracking-tight mb-2">
                            {stage.name}
                          </h2>

                          {stage.description && (
                            <p className="text-base text-text-secondary leading-relaxed">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
