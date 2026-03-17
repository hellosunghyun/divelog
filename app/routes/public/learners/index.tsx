import type { Route } from "./+types/index";
import LearnerCard from "~/components/cards/LearnerCard";
import HeroSection from "~/components/sections/HeroSection";
import EmptyState from "~/components/feedback/EmptyState";
import FilterBar from "~/components/filters/FilterBar";
import { motion } from "~/lib/motion";
import { staggerContainer, staggerItem } from "~/lib/motion-utils";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "러너 — DiveLog" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { getLearnersWithActivity, getDistinctCohorts } = await import("~/db/queries/learners/learners.server");
  const { createLogger } = await import("~/lib/logger.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "learners" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const cohortFilter = url.searchParams.get("cohort") ?? undefined;

  const [learners, cohorts] = await Promise.all([
    getLearnersWithActivity(context.cloudflare.env.DB, cohortFilter),
    getDistinctCohorts(context.cloudflare.env.DB),
  ]);

  logger.info("loader_end");
  return { learners, cohorts, selectedCohort: cohortFilter ?? null };
}

export default function LearnersPage({ loaderData }: Route.ComponentProps) {
  const { learners, cohorts, selectedCohort } = loaderData;

  const filterOptions =
    cohorts.length > 0
      ? [
          {
            key: "cohort",
            label: "Cohort",
            values: cohorts.map((cohort: typeof cohorts[number]) => ({ value: cohort, label: cohort })),
          },
        ]
      : [];

  return (
    <div>
      <HeroSection
        variant="learner"
        title="러너"
        subtitle="탐구하는 사람들을 만나보세요"
      />
      <div className="max-w-content mx-auto py-16 px-6">
        <h2 className="sr-only">러너 목록</h2>
        {filterOptions.length > 0 && (
          <div className="mb-10">
            <FilterBar filters={filterOptions} />
          </div>
        )}

        {learners.length === 0 ? (
          <EmptyState
            variant="learners"
            message={
              selectedCohort
                ? `${selectedCohort} 코호트에 등록된 러너가 없습니다.`
                : undefined
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {learners.map((learner: typeof learners[number]) => (
              <motion.div key={learner.userId} variants={staggerItem}>
                <LearnerCard
                  learner={{
                    userId: learner.userId,
                    slug: learner.slug,
                    displayName: learner.displayName,
                    profilePhotoUrl: learner.profilePhotoUrl,
                    cohort: learner.cohort,
                    bio: learner.bio,
                    currentQuestion: learner.currentQuestion,
                  }}
                  recentRecord={
                    learner.recentRecord
                      ? {
                          slug: learner.recentRecord.slug,
                          title: learner.recentRecord.title,
                        }
                      : undefined
                  }
                  stage={learner.stage ?? undefined}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
