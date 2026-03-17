import type { Route } from "./+types/analytics";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import {
  adminCardClass,
  adminCardHeaderClass,
  adminCardBodyClass,
} from "~/components/admin/admin-patterns";

export function meta(_: Route.MetaArgs) {
  return [{ title: "애널리틱스" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { records, questions, responses, learnerProfiles, stages, challenges, collaborationUnits } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.analytics" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  const [
    totalRecords,
    totalQuestions,
    totalResponses,
    totalLearners,
    totalChallenges,
    totalCollaborationUnits,
    recentRecords,
    recentResponses,
    currentStage,
  ] = await database.batch([
    database.select({ count: sql<number>`count(*)` }).from(records),
    database.select({ count: sql<number>`count(*)` }).from(questions),
    database.select({ count: sql<number>`count(*)` }).from(responses),
    database.select({ count: sql<number>`count(*)` }).from(learnerProfiles),
    database.select({ count: sql<number>`count(*)` }).from(challenges),
    database.select({ count: sql<number>`count(*)` }).from(collaborationUnits),
    database.select({ count: sql<number>`count(*)` }).from(records).where(gte(records.createdAt, oneWeekAgo)),
    database.select({ count: sql<number>`count(*)` }).from(responses).where(gte(responses.createdAt, oneWeekAgo)),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
  ]);

  const stageStats = await database
    .select({
      stageId: records.stageId,
      stageName: stages.name,
      count: sql<number>`count(*)`,
    })
    .from(records)
    .leftJoin(stages, eq(records.stageId, stages.id))
    .groupBy(records.stageId, stages.name)
    .orderBy(desc(sql`count(*)`));

  return {
    stats: {
      records: totalRecords[0]?.count ?? 0,
      questions: totalQuestions[0]?.count ?? 0,
      responses: totalResponses[0]?.count ?? 0,
      learners: totalLearners[0]?.count ?? 0,
      challenges: totalChallenges[0]?.count ?? 0,
      collaborationUnits: totalCollaborationUnits[0]?.count ?? 0,
      recentRecords: recentRecords[0]?.count ?? 0,
      recentResponses: recentResponses[0]?.count ?? 0,
    },
    currentStage: currentStage[0] ?? null,
    stageStats,
  };
}

export default function AdminAnalyticsPage({ loaderData }: Route.ComponentProps) {
  const { stats, currentStage, stageStats } = loaderData;

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">애널리틱스</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "전체 기록", value: stats.records, highlight: false },
          { label: "전체 질문", value: stats.questions, highlight: false },
          { label: "전체 응답", value: stats.responses, highlight: false },
          { label: "전체 러너", value: stats.learners, highlight: true },
          { label: "진행 중 챌린지", value: stats.challenges, highlight: false },
          { label: "협업 유닛", value: stats.collaborationUnits, highlight: false },
          { label: "최근 7일 기록", value: stats.recentRecords, highlight: true },
          { label: "최근 7일 응답", value: stats.recentResponses, highlight: true },
        ].map((item) => (
          <div
            key={item.label}
            className={`bg-admin-surface border rounded-lg p-4 ${
              item.highlight ? "border-admin-accent/30 bg-admin-accent/5" : "border-admin-border"
            }`}
          >
            <p className="text-xs text-admin-text-secondary mb-1">{item.label}</p>
            <p className="text-2xl font-semibold text-admin-text tabular-nums">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentStage && (
          <div className={adminCardClass}>
            <div className={adminCardHeaderClass}>
              <h3 className="text-sm font-semibold text-admin-text">현재 Stage</h3>
            </div>
            <div className={adminCardBodyClass}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-admin-accent" />
                <div>
                  <p className="text-base font-medium text-admin-text">{currentStage.name}</p>
                  <p className="text-caption text-admin-text-secondary mt-0.5">
                    {currentStage.description || "설명 없음"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-admin-border grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-admin-text-secondary mb-1">주차</p>
                  <p className="text-sm font-medium text-admin-text tabular-nums">
                    {currentStage.weekNumber ?? "-"}주차
                  </p>
                </div>
                <div>
                  <p className="text-xs text-admin-text-secondary mb-1">Phase</p>
                  <p className="text-sm font-medium text-admin-text">
                    {currentStage.phase ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={adminCardClass}>
          <div className={adminCardHeaderClass}>
            <h3 className="text-sm font-semibold text-admin-text">Stage별 기록 분포</h3>
          </div>
          <div className={adminCardBodyClass}>
            {stageStats.length === 0 ? (
              <p className="text-caption text-admin-text-secondary">데이터가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {stageStats.slice(0, 6).map((stat, idx) => {
                  const maxCount = stageStats[0]?.count ?? 1;
                  const percentage = Math.round((stat.count / maxCount) * 100);
                  return (
                    <div key={stat.stageId ?? idx} className="flex items-center gap-3">
                      <div className="w-28 text-caption text-admin-text truncate">
                        {stat.stageName || "미분류"}
                      </div>
                      <div className="flex-1 h-2 bg-admin-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin-accent rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-caption text-admin-text-secondary tabular-nums">
                        {stat.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={adminCardClass}>
          <div className={adminCardHeaderClass}>
            <h3 className="text-sm font-semibold text-admin-text">활동 요약</h3>
          </div>
          <div className={adminCardBodyClass}>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-admin-border">
                <span className="text-caption text-admin-text-secondary">질문당 평균 응답</span>
                <span className="text-sm font-medium text-admin-text tabular-nums">
                  {stats.questions > 0
                    ? (stats.responses / stats.questions).toFixed(1)
                    : "0.0"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-admin-border">
                <span className="text-caption text-admin-text-secondary">러너당 평균 기록</span>
                <span className="text-sm font-medium text-admin-text tabular-nums">
                  {stats.learners > 0
                    ? (stats.records / stats.learners).toFixed(1)
                    : "0.0"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-admin-border">
                <span className="text-caption text-admin-text-secondary">최근 7일 활동률</span>
                <span className="text-sm font-medium text-admin-text tabular-nums">
                  {stats.records > 0
                    ? `${Math.round((stats.recentRecords / stats.records) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-caption text-admin-text-secondary">협업 참여율</span>
                <span className="text-sm font-medium text-admin-text tabular-nums">
                  {stats.learners > 0
                    ? `${Math.round((stats.collaborationUnits / stats.learners) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={adminCardClass}>
          <div className={adminCardHeaderClass}>
            <h3 className="text-sm font-semibold text-admin-text">플랫폼 현황</h3>
          </div>
          <div className={adminCardBodyClass}>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-admin-bg rounded-lg">
                <p className="text-xs text-admin-text-secondary mb-1">Stage</p>
                <p className="text-lg font-semibold text-admin-text tabular-nums">
                  {stageStats.length}
                </p>
              </div>
              <div className="p-3 bg-admin-bg rounded-lg">
                <p className="text-xs text-admin-text-secondary mb-1">Challenge</p>
                <p className="text-lg font-semibold text-admin-text tabular-nums">
                  {stats.challenges}
                </p>
              </div>
              <div className="p-3 bg-admin-bg rounded-lg">
                <p className="text-xs text-admin-text-secondary mb-1">협업 유닛</p>
                <p className="text-lg font-semibold text-admin-text tabular-nums">
                  {stats.collaborationUnits}
                </p>
              </div>
              <div className="p-3 bg-admin-bg rounded-lg">
                <p className="text-xs text-admin-text-secondary mb-1">총 콘텐츠</p>
                <p className="text-lg font-semibold text-admin-text tabular-nums">
                  {(stats.records + stats.questions + stats.responses).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
