import type { Route } from "./+types/index";
import { useSearchParams } from "react-router";
import LearnerCard from "~/components/LearnerCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getLearnersWithActivity, getDistinctCohorts } from "~/db/queries/learners.server";
import { createLogger } from "~/lib/logger.server";

const ALL_COHORT_VALUE = "__all__";

export function meta(_args: Route.MetaArgs) {
   return [{ title: "러너 — DiveLog" }];
 }

export async function loader({ context, request }: Route.LoaderArgs) {
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
  const [, setSearchParams] = useSearchParams();

  const filterOptions =
    cohorts.length > 0
      ? [
          {
            key: "cohort",
            label: "Cohort",
            values: cohorts.map((cohort) => ({ value: cohort, label: cohort })),
          },
        ]
      : [];

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams();
    if (value) {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const currentCohort = selectedCohort;

  return (
    <div>
      <HeroSection
         variant="learner"
         title="러너"
         subtitle="탐구하는 사람들을 만나보세요"
       />
      <div className="max-w-content mx-auto py-16 px-6">
        {filterOptions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <Label
                htmlFor="filter-cohort"
                className="text-meta text-text-secondary"
              >
                Cohort
              </Label>
              <Select
                value={currentCohort ?? ALL_COHORT_VALUE}
                onValueChange={(value) =>
                  handleFilterChange("cohort", value === ALL_COHORT_VALUE ? "" : value)
                }
              >
                <SelectTrigger
                  id="filter-cohort"
                  className="h-9 min-w-32 rounded-lg border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-none focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COHORT_VALUE}>전체</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort} value={cohort}>
                      {cohort}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {learners.length === 0 ? (
          <EmptyState
            variant="learners"
             message={
               currentCohort
                 ? `${currentCohort} 코호트에 등록된 러너가 없습니다.`
                 : undefined
             }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {learners.map((learner) => (
              <LearnerCard
                key={learner.userId}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
