import type { Route } from "./+types/index";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { challenges } from "~/db/schema.server";
import { asc } from "drizzle-orm";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { createLogger } from "~/lib/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "챌린지 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "challenges" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const allChallenges = await database.select().from(challenges).orderBy(asc(challenges.name));
  logger.info("loader_end");
  return { challenges: allChallenges };
}

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  upcoming: "예정",
};

export default function ChallengesPage({ loaderData }: Route.ComponentProps) {
  const { challenges: allChallenges } = loaderData;
  
  return (
    <div>
      <HeroSection variant="challenge" title="챌린지" subtitle="함께 탐구하는 공동의 도전들" />
      <div className="max-w-content mx-auto py-16 px-6">
        {allChallenges.length === 0 ? (
          <EmptyState variant="generic" message="아직 진행 중인 챌린지가 없습니다." />
        ) : (
          <div className="flex flex-col gap-5">
            {allChallenges.map((challenge) => (
              <Link key={challenge.id} to={`/challenges/${challenge.slug}`} className="block no-underline bg-surface rounded-lg border border-border p-6 shadow-sm transition-all duration-normal hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">
                {challenge.currentQuestion && (
                  <p className="text-base text-ocean-blue italic mb-3">
                    "{challenge.currentQuestion}"
                  </p>
                )}
                <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-2">
                  {challenge.name}
                </h2>
                {challenge.problemDefinition && (
                  <p className="text-base text-text-secondary leading-normal">
                    {challenge.problemDefinition}
                  </p>
                )}
                <div className="mt-3 text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary inline-block">
                  {STATUS_LABELS[challenge.status] ?? challenge.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
