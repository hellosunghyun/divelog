import type { Route } from "./+types/analytics";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { records, questions, responses, learnerProfiles, stages } from "~/db/schema.server";
import { eq, sql, desc } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "애널리틱스" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.analytics" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const [totalRecords, totalQuestions, totalResponses, totalLearners, currentStage] = await database.batch([
    database.select({ count: sql<number>`count(*)` }).from(records),
    database.select({ count: sql<number>`count(*)` }).from(questions),
    database.select({ count: sql<number>`count(*)` }).from(responses),
    database.select({ count: sql<number>`count(*)` }).from(learnerProfiles),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
  ]);
  return {
    stats: {
      records: totalRecords[0]?.count ?? 0,
      questions: totalQuestions[0]?.count ?? 0,
      responses: totalResponses[0]?.count ?? 0,
      learners: totalLearners[0]?.count ?? 0,
    },
    currentStage: currentStage[0] ?? null,
  };
}
export default function AdminAnalyticsPage({ loaderData }: Route.ComponentProps) {
  const { stats, currentStage } = loaderData;
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">애널리틱스</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          { label: "전체 기록", value: stats.records },
          { label: "전체 질문", value: stats.questions },
          { label: "전체 응답", value: stats.responses },
          { label: "전체 Learner", value: stats.learners },
        ].map((item) => (
          <div key={item.label} className="bg-admin-surface border border-admin-border rounded-lg p-5">
            <p className="text-caption text-admin-text-secondary mb-2">{item.label}</p>
            <p className="text-3xl font-semibold text-admin-text">{item.value}</p>
          </div>
        ))}
      </div>
      {currentStage && (
        <div className="bg-admin-surface border border-admin-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3 text-admin-text">현재 Stage</h3>
          <p className="text-base text-admin-text">{currentStage.name}</p>
          <p className="text-meta text-admin-text-secondary mt-1">{currentStage.description}</p>
        </div>
      )}
    </div>
  );
}
