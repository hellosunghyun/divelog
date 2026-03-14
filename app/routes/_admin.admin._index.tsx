import type { Route } from "./+types/_admin.admin._index";
import { db } from "../db/client.server";
import { stages, records, learnerProfiles } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import { Link } from "react-router";

export function meta(_: Route.MetaArgs) { return [{ title: "Admin 대시보드" }]; }

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const [currentStage, recentRecords, flaggedRecords, allLearners] = await database.batch([
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
    database.select({ record: records, author: { displayName: learnerProfiles.displayName } }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId)).orderBy(desc(records.createdAt)).limit(5),
    database.select().from(records).where(eq(records.moderationStatus, "flagged")).limit(5),
    database.select().from(learnerProfiles),
  ]);
  return { currentStage: currentStage[0] ?? null, recentRecords, flaggedRecords, learnerCount: allLearners.length };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { currentStage, recentRecords, flaggedRecords, learnerCount } = loaderData;
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">대시보드</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "현재 Stage", value: currentStage?.name ?? "없음" },
          { label: "전체 Learner", value: String(learnerCount) },
          { label: "최근 기록", value: String(recentRecords.length) },
          { label: "Flagged 기록", value: String(flaggedRecords.length), urgent: flaggedRecords.length > 0 },
        ].map((panel) => (
          <div key={panel.label} className={`bg-admin-surface rounded-md border p-4 ${panel.urgent ? "border-error" : "border-admin-border"}`}>
            <p className="text-xs text-admin-text-secondary mb-2">{panel.label}</p>
            <p className={`text-2xl font-semibold ${panel.urgent ? "text-error" : "text-admin-text"}`}>{panel.value}</p>
          </div>
        ))}
      </div>
      {flaggedRecords.length > 0 && (
        <div className="bg-admin-surface border border-error rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-error mb-3">Flagged 기록</h3>
          {flaggedRecords.map((r) => (
            <div key={r.id} className="flex gap-3 py-2 border-b border-admin-border last:border-b-0">
              <span className="text-[13px] text-admin-text flex-1">{r.title}</span>
              <Link to={`/admin/records/${r.id}`} className="text-xs text-admin-accent hover:underline">검토하기</Link>
            </div>
          ))}
        </div>
      )}
      <div className="bg-admin-surface border border-admin-border rounded-md p-4">
        <h3 className="text-sm font-semibold text-admin-text mb-3">최근 기록</h3>
        {recentRecords.map(({ record, author }) => (
          <div key={record.id} className="flex gap-3 py-2 border-b border-admin-border last:border-b-0">
            <span className="text-[13px] text-admin-text flex-1">{record.title}</span>
            <span className="text-xs text-admin-text-secondary">{author?.displayName}</span>
            <Link to={`/admin/records/${record.id}`} className="text-xs text-admin-accent hover:underline">보기</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
