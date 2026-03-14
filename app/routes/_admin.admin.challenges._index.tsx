import type { Route } from "./+types/_admin.admin.challenges._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { challenges: await db(context.cloudflare.env.DB).select().from(challenges).orderBy(asc(challenges.name)) };
}
export default function AdminChallengesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">챌린지 관리</h2>
      {loaderData.challenges.length === 0 ? (
        <EmptyState variant="generic" message="등록된 챌린지가 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["이름", "상태", "코호트", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.challenges.map((c) => (
              <tr key={c.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px] text-admin-text">{c.name}</td>
                <td className="px-3 py-2 text-[13px]">{c.status}</td>
                <td className="px-3 py-2 text-[13px]">{c.cohort ?? "-"}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/challenges/${c.id}`} className="text-xs text-admin-accent hover:underline">편집</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
