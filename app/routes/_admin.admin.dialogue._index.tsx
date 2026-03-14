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
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["유형", "내용", "작성자", "moderation", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.responses.map(({ response, author }) => (
              <tr key={response.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px]">{response.type}</td>
                <td className="px-3 py-2 text-[13px] max-w-[300px] truncate">{response.content}</td>
                <td className="px-3 py-2 text-[13px]">{author?.displayName ?? "-"}</td>
                <td className={`px-3 py-2 text-[13px] ${response.moderationStatus === "flagged" ? "text-error" : ""}`}>{response.moderationStatus}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/dialogue/${response.id}`} className="text-xs text-admin-accent hover:underline">검토</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
