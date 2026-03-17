import type { Route } from "./+types/index";
import { eq, desc } from "drizzle-orm";
import { Link } from "~/components/content/SmartLink";

export function meta(_: Route.MetaArgs) { return [{ title: "Admin 대시보드" }]; }

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { stages, records, learnerProfiles } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dashboard" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const [currentStage, recentRecords, flaggedRecords, allLearners] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select({ record: records, author: { displayName: learnerProfiles.displayName } }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId)).orderBy(desc(records.createdAt)).limit(5),
    database.select().from(records).where(eq(records.moderationStatus, "flagged")).limit(5),
    database.select().from(learnerProfiles),
  ]);
  return { currentStage: currentStage[0] ?? null, recentRecords, flaggedRecords, learnerCount: allLearners.length };
}

type FlaggedRecord = typeof records.$inferSelect;
type RecentRecord = {
  record: typeof records.$inferSelect;
  author: { displayName: string | null } | null;
};

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { currentStage, recentRecords, flaggedRecords, learnerCount } = loaderData;
  
  const formatDate = (date: number | null) => {
    if (!date) return "-";
    return new Date(date * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">대시보드</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-admin-surface border border-admin-border rounded-lg p-4">
          <p className="text-xs text-admin-text-secondary mb-1">현재 Stage</p>
          <p className="text-lg font-semibold text-admin-text tabular-nums">{currentStage?.name ?? "없음"}</p>
        </div>
        <div className="bg-admin-surface border border-admin-border rounded-lg p-4">
          <p className="text-xs text-admin-text-secondary mb-1">전체 러너</p>
          <p className="text-2xl font-semibold text-admin-text tabular-nums">{learnerCount}</p>
        </div>
        <div className="bg-admin-surface border border-admin-border rounded-lg p-4">
          <p className="text-xs text-admin-text-secondary mb-1">최근 기록</p>
          <p className="text-2xl font-semibold text-admin-text tabular-nums">{recentRecords.length}</p>
        </div>
        <div className={`bg-admin-surface border rounded-lg p-4 ${flaggedRecords.length > 0 ? "border-error" : "border-admin-border"}`}>
          <p className="text-xs text-admin-text-secondary mb-1">Flagged 기록</p>
          <p className={`text-2xl font-semibold tabular-nums ${flaggedRecords.length > 0 ? "text-error" : "text-admin-text"}`}>
            {flaggedRecords.length}
          </p>
        </div>
      </div>

      {flaggedRecords.length > 0 && (
        <div className="bg-admin-surface border border-error rounded-lg mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-error bg-red-50/50">
            <h3 className="text-sm font-semibold text-error">Flagged 기록</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-admin-surface-secondary">
                <th className="px-4 py-2 text-left text-xs font-medium text-admin-text-secondary uppercase">제목</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-admin-text-secondary uppercase">날짜</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-admin-text-secondary uppercase">작업</th>
              </tr>
            </thead>
            <tbody>
              {flaggedRecords.map((r: FlaggedRecord) => (
                <tr key={r.id} className="border-b border-admin-border last:border-b-0 hover:bg-admin-surface-secondary">
                  <td className="px-4 py-3 text-admin-text">{r.title || "제목 없음"}</td>
                  <td className="px-4 py-3 text-admin-text-secondary tabular-nums">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/records/${r.id}`} className="text-xs text-admin-accent hover:underline">검토하기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-admin-surface border border-admin-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-admin-border">
          <h3 className="text-sm font-semibold text-admin-text">최근 기록</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-admin-border bg-admin-surface-secondary">
              <th className="px-4 py-2 text-left text-xs font-medium text-admin-text-secondary uppercase">제목</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-admin-text-secondary uppercase">작성자</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-admin-text-secondary uppercase">날짜</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-admin-text-secondary uppercase">작업</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-admin-text-secondary">기록이 없습니다</td>
              </tr>
            ) : (
              recentRecords.map(({ record, author }: RecentRecord) => (
                <tr key={record.id} className="border-b border-admin-border last:border-b-0 hover:bg-admin-surface-secondary">
                  <td className="px-4 py-3 text-admin-text">{record.title || "제목 없음"}</td>
                  <td className="px-4 py-3 text-admin-text-secondary">{author?.displayName ?? "알 수 없음"}</td>
                  <td className="px-4 py-3 text-admin-text-secondary tabular-nums">{formatDate(record.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/records/${record.id}`} className="text-xs text-admin-accent hover:underline">보기</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
