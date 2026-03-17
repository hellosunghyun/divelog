import type { Route } from "./+types/index";
import { Link } from "~/components/content/SmartLink";
import { asc } from "drizzle-orm";
import HeroSection from "~/components/sections/HeroSection";
import EmptyState from "~/components/feedback/EmptyState";
import { db } from "~/db/client.server";
import { challenges } from "~/db/schema.server";
import { createLogger } from "~/lib/infra/logger.server";
import { motion } from "~/lib/motion/motion";
import { staggerContainer, staggerItem } from "~/lib/motion/motion-utils";
import { cn } from "~/lib/utils/cn";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "챌린지 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "challenges" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const allChallenges = await database.select().from(challenges).orderBy(asc(challenges.name));
  logger.info("loader_end");
  return { challenges: allChallenges };
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  upcoming: "예정",
};

const STATUS_ACCENTS: Record<string, { bg: string; text: string; border?: string }> = {
  active: { bg: "bg-challenge/10", text: "text-challenge" },
  completed: { bg: "bg-surface-secondary", text: "text-text-secondary" },
  upcoming: { bg: "bg-mist-blue", text: "text-ocean-blue" },
};

export default function ChallengesPage({ loaderData }: Route.ComponentProps) {
  const { challenges: allChallenges } = loaderData;

  return (
    <div>
      <HeroSection variant="challenge" title="챌린지" subtitle="함께 탐구하는 공동의 도전들" />

      <div className="max-w-content mx-auto px-6 py-16 md:py-24">
        {allChallenges.length === 0 ? (
          <EmptyState variant="generic" message="아직 진행 중인 챌린지가 없습니다." />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5"
          >
            {allChallenges.map((challenge: { id: string; slug: string; name: string; status: string; currentQuestion: string | null; problemDefinition: string | null }) => {
              const statusAccent = STATUS_ACCENTS[challenge.status] ?? STATUS_ACCENTS.active;
              const isActive = challenge.status === "active";

              return (
                <motion.div key={challenge.id} variants={staggerItem}>
                  <Link
                    to={`/challenges/${challenge.slug}`}
                    className={cn(
                      "group block no-underline",
                      "ring-1 ring-border p-1.5 rounded-2xl",
                      "hover:shadow-tinted-md transition-premium",
                      challenge.status === "upcoming" && "opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-xl p-6 md:p-7 h-full flex flex-col gap-4",
                        isActive
                          ? "bg-gradient-to-br from-mist-blue/40 via-surface to-mist-blue/20"
                          : "bg-surface"
                      )}
                    >
                      {challenge.currentQuestion && (
                        <p className="text-lg md:text-xl text-ocean-blue italic leading-relaxed">
                          "{challenge.currentQuestion}"
                        </p>
                      )}

                      <h2 className="text-xl font-semibold text-deep-ocean tracking-tight">
                        {challenge.name}
                      </h2>

                      {challenge.problemDefinition && (
                        <p className="text-base text-text-secondary leading-relaxed">
                          {challenge.problemDefinition}
                        </p>
                      )}

                      <div className="pt-2">
                        <span
                          className={cn(
                            "text-caption font-medium px-3 py-1 rounded-full",
                            statusAccent.bg,
                            statusAccent.text,
                            statusAccent.border
                          )}
                        >
                          {STATUS_LABELS[challenge.status] ?? challenge.status}
                        </span>
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
