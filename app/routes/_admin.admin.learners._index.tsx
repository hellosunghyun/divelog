import type { Route } from "./+types/_admin.admin.learners._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Learner 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { learners: await db(context.cloudflare.env.DB).select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName)) };
}
export default function AdminLearnersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Learner 관리 ({loaderData.learners.length}명)</h2>
      {loaderData.learners.length === 0 ? (
        <EmptyState variant="generic" message="등록된 Learner가 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["이름", "Slug", "코호트", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.learners.map((l) => (
              <tr key={l.userId} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px] text-admin-text">{l.displayName}</td>
                <td className="px-3 py-2 text-[13px] text-admin-text-secondary">{l.slug}</td>
                <td className="px-3 py-2 text-[13px]">{l.cohort ?? "-"}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/learners/${l.userId}`} className="text-xs text-admin-accent hover:underline">상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
