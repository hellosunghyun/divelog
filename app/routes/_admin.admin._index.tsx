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
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "24px" }}>대시보드</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "현재 Stage", value: currentStage?.name ?? "없음" },
          { label: "전체 Learner", value: String(learnerCount) },
          { label: "최근 기록", value: String(recentRecords.length) },
          { label: "Flagged 기록", value: String(flaggedRecords.length), urgent: flaggedRecords.length > 0 },
        ].map((panel) => (
          <div key={panel.label} style={{ backgroundColor: "var(--color-admin-surface)", border: `1px solid ${panel.urgent ? "var(--color-error)" : "var(--color-admin-border)"}`, borderRadius: "8px", padding: "20px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)", marginBottom: "8px" }}>{panel.label}</p>
            <p style={{ fontSize: "24px", fontWeight: "700", color: panel.urgent ? "var(--color-error)" : "var(--color-admin-text)" }}>{panel.value}</p>
          </div>
        ))}
      </div>
      {flaggedRecords.length > 0 && (
        <div style={{ backgroundColor: "var(--color-admin-surface)", border: "1px solid var(--color-error)", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-error)", marginBottom: "12px" }}>Flagged 기록</h3>
          {flaggedRecords.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)" }}>
              <span style={{ fontSize: "13px", color: "var(--color-admin-text)", flex: 1 }}>{r.title}</span>
              <Link to={`/admin/records/${r.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>검토하기</Link>
            </div>
          ))}
        </div>
      )}
      <div style={{ backgroundColor: "var(--color-admin-surface)", border: "1px solid var(--color-admin-border)", borderRadius: "8px", padding: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-admin-text)", marginBottom: "12px" }}>최근 기록</h3>
        {recentRecords.map(({ record, author }) => (
          <div key={record.id} style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--color-admin-border)" }}>
            <span style={{ fontSize: "13px", color: "var(--color-admin-text)", flex: 1 }}>{record.title}</span>
            <span style={{ fontSize: "12px", color: "var(--color-admin-text-secondary)" }}>{author?.displayName}</span>
            <Link to={`/admin/records/${record.id}`} style={{ fontSize: "12px", color: "var(--color-admin-accent)" }}>보기</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
