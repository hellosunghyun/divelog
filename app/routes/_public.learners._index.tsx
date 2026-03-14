import type { Route } from "./+types/_public.learners._index";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
import { asc } from "drizzle-orm";
import LearnerCard from "../components/LearnerCard";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Learner — divelog" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const learners = await database.select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName));
  return { learners };
}

export default function LearnersPage({ loaderData }: Route.ComponentProps) {
  const { learners } = loaderData;
  return (
    <div>
      <HeroSection variant="learner" title="Learner" subtitle="탐구하는 사람들을 만나보세요" />
      <div className="max-w-content mx-auto py-16 px-6">
        {learners.length === 0 ? (
          <EmptyState variant="learners" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {learners.map((learner) => <LearnerCard key={learner.userId} learner={learner} />)}
          </div>
        )}
      </div>
    </div>
  );
}
