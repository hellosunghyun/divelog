import type { Route } from "./+types/_admin.admin.records._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { records, learnerProfiles } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "기록 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.records" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const database = db(context.cloudflare.env.DB);
  const base = database.select({ record: records, author: { displayName: learnerProfiles.displayName } }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId)).orderBy(desc(records.createdAt)).limit(50);
  const result = filter === "flagged" ? await base.where(eq(records.moderationStatus, "flagged")) : await base;
  return { records: result };
}
export default function AdminRecordsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">기록 관리</h2>
        <div className="flex gap-2">
          <a href="/admin/records" className="text-xs px-2.5 py-1 rounded bg-admin-border text-admin-text no-underline hover:opacity-80">전체</a>
          <a href="?filter=flagged" className="text-xs px-2.5 py-1 rounded bg-error text-white no-underline hover:opacity-80">Flagged</a>
        </div>
      </div>
      {loaderData.records.length === 0 ? (
        <EmptyState variant="generic" message="기록이 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["제목", "작성자", "형식", "공개", "moderation", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.records.map(({ record, author }) => (
              <tr key={record.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px] max-w-[200px] truncate">{record.title}</td>
                <td className="px-3 py-2 text-[13px]">{author?.displayName ?? "-"}</td>
                <td className="px-3 py-2 text-[13px]">{record.format}</td>
                <td className="px-3 py-2 text-[13px]">{record.visibility}</td>
                <td className={`px-3 py-2 text-[13px] ${record.moderationStatus === "flagged" ? "text-error" : ""}`}>{record.moderationStatus}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/records/${record.id}`} className="text-xs text-admin-accent hover:underline">검토</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
