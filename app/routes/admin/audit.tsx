import type { Route } from "./+types/audit";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { auditLogs } from "~/db/schema.server";
import { eq, desc } from "drizzle-orm";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type AuditLog = typeof auditLogs.$inferSelect;

export function meta(_: Route.MetaArgs) { return [{ title: "감사 로그" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.audit" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const targetType = url.searchParams.get("type");
  const database = db(context.cloudflare.env.DB);
  const base = database.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  const logs = targetType ? await base.where(eq(auditLogs.targetType, targetType)) : await base;
  return { logs, targetType };
}
export default function AdminAuditPage({ loaderData }: Route.ComponentProps) {
  const { logs, targetType } = loaderData;
  const TARGET_TYPES = ["record", "stage", "learner", "response", "challenge", "collaboration", "memory"];
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-admin-text">감사 로그</h2>
        <div className="flex gap-1.5 flex-wrap">
          <a href="/admin/audit" className={`text-caption px-2 py-0.5 rounded-full no-underline ${!targetType ? "bg-admin-accent text-white" : "bg-admin-bg text-admin-text border border-admin-border"} hover:opacity-80 transition-opacity`}>전체</a>
          {TARGET_TYPES.map((t) => (
            <a key={t} href={`?type=${t}`} className={`text-caption px-2 py-0.5 rounded-full no-underline ${targetType === t ? "bg-admin-accent text-white" : "bg-admin-bg text-admin-text border border-admin-border"} hover:opacity-80 transition-opacity`}>{t}</a>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader className="bg-admin-bg">
          <TableRow className="border-admin-border hover:bg-admin-bg">
            {["행위자", "대상 유형", "대상 ID", "액션", "시각"].map((header) => (
              <TableHead
                key={header}
                className="h-auto px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: AuditLog) => (
            <TableRow key={log.id} className="border-admin-border hover:bg-admin-bg/50">
              <TableCell className="px-4 py-3 font-mono text-caption text-admin-text-secondary">
                {log.actorId.substring(0, 12)}
              </TableCell>
              <TableCell className="px-4 py-3 text-meta text-admin-text">
                <Badge variant="outline" className="text-admin-text">
                  {log.targetType}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 font-mono text-caption text-admin-text-secondary">
                {log.targetId.substring(0, 12)}
              </TableCell>
              <TableCell className="px-4 py-3 text-meta text-admin-text">
                <Badge variant="secondary">{log.action}</Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-caption text-admin-text-secondary">
                {new Date((log.createdAt ?? 0) * 1000).toLocaleString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
