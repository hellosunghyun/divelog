import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { sql } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function meta(_: Route.MetaArgs) { return [{ title: "Stage 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { stages } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.stages" });
  logger.info("loader_start");
  return { stages: await db(context.cloudflare.env.DB).select().from(stages).orderBy(sql`"order" ASC`) };
}
export default function AdminStagesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Stage 관리</h2>
      {loaderData.stages.length === 0 ? (
        <EmptyState variant="generic" message="등록된 Stage가 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {["순서", "이름", "유형", "상태", "시작일", "종료일", "현재", "작업"].map((h) => (
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
            {loaderData.stages.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="px-3 py-2 text-sm">{s.order}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-admin-text">{s.name}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{s.type}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{s.status}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-admin-text-secondary">{formatDate(s.startDate)}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-admin-text-secondary">{formatDate(s.endDate)}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{s.isCurrent ? "✓" : ""}</TableCell>
                <TableCell className="px-3 py-2">
                  <Link to={`/admin/stages/${s.id}`} className="text-xs text-admin-accent hover:underline">편집</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
