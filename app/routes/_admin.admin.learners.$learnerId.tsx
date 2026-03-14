import { data } from "react-router";
import type { Route } from "./+types/_admin.admin.learners.$learnerId";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { learnerProfiles, records } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";

export async function loader({ params, context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const learner = await database.select().from(learnerProfiles).where(eq(learnerProfiles.userId, params.learnerId)).limit(1);
  if (!learner[0]) throw data("Learner not found", { status: 404 });
  const lr = await database.select().from(records).where(eq(records.authorId, params.learnerId)).orderBy(desc(records.createdAt)).limit(20);
  return { learner: learner[0], records: lr };
}
export function meta(_: Route.MetaArgs) { return [{ title: "Learner 상세" }]; }
export default function AdminLearnerDetailPage({ loaderData }: Route.ComponentProps) {
  const { learner, records: lr } = loaderData;
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}><Link to="/admin/learners" style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>← 목록</Link><h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-admin-text)" }}>{learner.displayName}</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>프로필</h3>
          <p style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)" }}>Slug: {learner.slug}</p>
          <p style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)", marginTop: "4px" }}>코호트: {learner.cohort ?? "-"}</p>
          <p style={{ fontSize: "13px", color: "var(--color-admin-text-secondary)", marginTop: "4px" }}>기록 수: {lr.length}</p>
        </div>
        <div style={{ backgroundColor: "var(--color-admin-surface)", borderRadius: "8px", padding: "20px", border: "1px solid var(--color-admin-border)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>최근 기록</h3>
          {lr.slice(0, 5).map((r) => (<div key={r.id} style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--color-admin-border)" }}><span style={{ fontSize: "12px", color: "var(--color-admin-text)", flex: 1 }}>{r.title}</span><span style={{ fontSize: "11px", color: "var(--color-admin-text-secondary)" }}>{r.visibility}</span></div>))}
        </div>
      </div>
    </div>
  );
}
