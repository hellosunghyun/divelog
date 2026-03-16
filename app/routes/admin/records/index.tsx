import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { records, learnerProfiles } from "~/db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
        <Table>
          <TableHeader>
            <TableRow>
              {["제목", "작성자", "형식", "공개", "moderation", "작업"].map((h) => (
                <TableHead
                  key={h}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.records.map(({ record, author }) => (
              <TableRow key={record.id}>
                <TableCell className="max-w-[200px] px-3 py-2 text-sm truncate">{record.title}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{author?.displayName ?? "-"}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{record.format}</TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Badge variant="outline">{record.visibility}</Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Badge variant={record.moderationStatus === "flagged" ? "destructive" : "secondary"}>
                    {record.moderationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Link to={`/admin/records/${record.id}`} className="text-xs text-admin-accent hover:underline">검토</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
