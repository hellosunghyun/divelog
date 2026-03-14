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
      <div className="flex gap-4 items-center mb-6">
        <Link to="/admin/learners" className="text-[13px] text-admin-text-secondary hover:text-admin-text">← 목록</Link>
        <h2 className="text-xl font-semibold text-admin-text">{learner.displayName}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-admin-surface rounded-md p-4 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4">프로필</h3>
          <p className="text-[13px] text-admin-text-secondary">Slug: {learner.slug}</p>
          <p className="text-[13px] text-admin-text-secondary mt-1">코호트: {learner.cohort ?? "-"}</p>
          <p className="text-[13px] text-admin-text-secondary mt-1">기록 수: {lr.length}</p>
        </div>
        <div className="bg-admin-surface rounded-md p-4 border border-admin-border">
          <h3 className="text-sm font-semibold mb-4">최근 기록</h3>
          {lr.slice(0, 5).map((r) => (
            <div key={r.id} className="flex gap-2 py-1.5 border-b border-admin-border last:border-b-0">
              <span className="text-xs text-admin-text flex-1">{r.title}</span>
              <span className="text-[11px] text-admin-text-secondary">{r.visibility}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
