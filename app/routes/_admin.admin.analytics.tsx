import type { Route } from "./+types/_admin.admin.analytics";
import { db } from "../db/client.server";
import { records, questions, responses, learnerProfiles, stages } from "../db/schema.server";
import { eq, sql, desc } from "drizzle-orm";

export function meta(_: Route.MetaArgs) { return [{ title: "애널리틱스" }]; }
export async function loader({ context }: Route.LoaderArgs) {
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
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>애널리틱스</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "전체 기록", value: stats.records },
          { label: "전체 질문", value: stats.questions },
          { label: "전체 응답", value: stats.responses },
          { label: "전체 Learner", value: stats.learners },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: "var(--color-admin-surface)", border: "1px solid var(--color-admin-border)", borderRadius: "8px", padding: "20px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "8px" }}>{item.label}</p>
            <p style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-admin-text)" }}>{item.value}</p>
          </div>
        ))}
      </div>
      {currentStage && (
        <div style={{ backgroundColor: "var(--color-admin-surface)", border: "1px solid var(--color-admin-border)", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "var(--color-admin-text)" }}>현재 Stage</h3>
          <p style={{ fontSize: "16px", color: "var(--color-admin-text)" }}>{currentStage.name}</p>
          <p style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)", marginTop: "4px" }}>{currentStage.description}</p>
        </div>
      )}
    </div>
  );
}
