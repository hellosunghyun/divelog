import type { Route } from "./+types/_admin.admin.dialogue._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { responses, learnerProfiles } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 관리" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { responses: await db(context.cloudflare.env.DB).select({ response: responses, author: { displayName: learnerProfiles.displayName } }).from(responses).leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId)).orderBy(desc(responses.createdAt)).limit(50) };
}
export default function AdminDialoguePage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Dialogue 관리</h2>
      {loaderData.responses.length === 0 ? (
        <EmptyState variant="generic" message="응답이 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-bg">
                {["유형", "내용", "작성자", "moderation", "작업"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.responses.map(({ response, author }) => (
                <tr key={response.id} className="border-t border-admin-border hover:bg-admin-bg/50 transition-colors">
                  <td className="px-4 py-3 text-meta text-admin-text">{response.type}</td>
                  <td className="px-4 py-3 text-meta text-admin-text max-w-[300px] truncate">{response.content}</td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">{author?.displayName ?? "-"}</td>
                  <td className={`px-4 py-3 text-meta ${response.moderationStatus === "flagged" ? "text-error" : "text-admin-text-secondary"}`}>{response.moderationStatus}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/dialogue/${response.id}`} className="text-caption text-admin-accent hover:underline">검토</Link>
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
