import type { Route } from "./+types/_admin.admin.challenges._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { challenges } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges" });
  logger.info("loader_start");
  return { challenges: await db(context.cloudflare.env.DB).select().from(challenges).orderBy(asc(challenges.name)) };
}
export default function AdminChallengesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">챌린지 관리</h2>
      {loaderData.challenges.length === 0 ? (
        <EmptyState variant="generic" message="등록된 챌린지가 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-bg">
                {["이름", "상태", "코호트", "작업"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.challenges.map((c) => (
                <tr key={c.id} className="border-t border-admin-border hover:bg-admin-bg/50 transition-colors">
                  <td className="px-4 py-3 text-meta text-admin-text">{c.name}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{c.status}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{c.cohort ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/challenges/${c.id}`} className="text-caption text-admin-accent hover:underline">편집</Link>
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
