import type { Route } from "./+types/index";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { learnerProfiles } from "~/db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "러너 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.learners" });
  logger.info("loader_start");
  return { learners: await db(context.cloudflare.env.DB).select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName)) };
}
export default function AdminLearnersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
       <h2 className="text-xl font-semibold text-admin-text mb-6">러너 관리 ({loaderData.learners.length}명)</h2>
      {loaderData.learners.length === 0 ? (
         <EmptyState variant="generic" message="등록된 러너가 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-bg">
                {["이름", "이메일", "코호트", "작업"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.learners.map((l) => (
                <tr key={l.userId} className="border-t border-admin-border hover:bg-admin-bg/50 transition-colors">
                  <td className="px-4 py-3 text-meta text-admin-text">{l.displayName}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{l.email ?? "-"}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{l.cohort ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/learners/${l.userId}`} className="text-caption text-admin-accent hover:underline">상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
